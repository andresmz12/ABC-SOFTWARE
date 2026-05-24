/**
 * Provider — My Jobs
 * Shows the provider's job history with tabs: Applied, Active, Completed
 * Includes: mark as completed (with photo requirement), trigger rating modal for client
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Alert, Modal,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';

type Tab = 'applied' | 'active' | 'completed';

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'open' ? C.warning :
    status === 'accepted' ? C.accent :
    status === 'in_progress' ? '#3B82F6' :
    status === 'completed' ? C.success : C.textMuted;
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 6 }} />;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const [yyyy, mm, dd] = iso.split('-');
  return `${mm}/${dd}/${yyyy}`;
}

interface CompleteModalProps {
  job: JobRequest | null;
  visible: boolean;
  es: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

function CompleteModal({ job, visible, es, onClose, onCompleted }: CompleteModalProps) {
  const [photos, setPhotos] = useState<{ uri: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhotos((prev) => [...prev, { uri: asset.uri, name: asset.fileName ?? `photo_${Date.now()}.jpg` }]);
    }
  };

  const handleComplete = async () => {
    if (!job) return;
    if (photos.length === 0) {
      Alert.alert(
        es ? 'Foto requerida' : 'Photo required',
        es
          ? 'Sube al menos una foto del trabajo terminado antes de marcarlo como completado.'
          : 'Please upload at least one after photo before marking as completed.',
      );
      return;
    }
    setSaving(true);
    try {
      const afterUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.name.split('.').pop() ?? 'jpg';
        const path = `${job.id}/after/${Date.now()}.${ext}`;
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        const { error: uploadErr } = await supabase.storage
          .from('job-photos')
          .upload(path, blob, { contentType: `image/${ext}`, upsert: true });
        if (!uploadErr) afterUrls.push(path);
      }

      const { error } = await supabase
        .from('job_requests')
        .update({ status: 'completed', photos_after: afterUrls })
        .eq('id', job.id);
      if (error) throw error;

      onCompleted();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
      setPhotos([]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.55)', justifyContent: 'flex-end' }}>
        <View style={{
          backgroundColor: C.surface,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 40,
          borderTopWidth: 1, borderTopColor: C.line,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
              {es ? 'Marcar como Completado' : 'Mark as Completed'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20, lineHeight: 21 }}>
            {es
              ? 'Sube fotos del trabajo terminado para completar el proceso.'
              : 'Upload photos of the finished work to complete the process.'}
          </Text>

          {/* Photos grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {photos.map((p, idx) => (
              <View key={idx} style={{ width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
                <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} />
                <TouchableOpacity
                  onPress={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                  style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="x" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={pickPhoto}
              style={{
                width: 80, height: 80, borderRadius: 10,
                borderWidth: 2, borderColor: C.line, borderStyle: 'dashed',
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: C.surface2,
              }}
            >
              <Feather name="camera" size={22} color={C.textMuted} />
              <Text style={{ color: C.textMuted, fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 4 }}>
                {es ? 'Agregar' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          {photos.length === 0 && (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start' }}>
              <Feather name="alert-triangle" size={16} color={C.warning} style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={{ color: '#92400E', fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 19 }}>
                {es
                  ? 'Se requiere al menos 1 foto del trabajo terminado.'
                  : 'At least 1 after photo is required.'}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>
                {es ? 'Cancelar' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleComplete}
              disabled={saving}
              style={{ flex: 2, height: 52, borderRadius: 12, backgroundColor: C.success, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.7 : 1 }}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Confirmar Completado' : 'Confirm Complete'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  appStatus,
  isRejected,
  es,
  onComplete,
}: {
  job: JobRequest;
  appStatus?: string;
  isRejected: boolean;
  es: boolean;
  onComplete?: () => void;
}) {
  const isCommercial = job.service_type === 'commercial';
  const accentColor = isCommercial ? C.accent2 : C.accent;

  return (
    <View style={{
      backgroundColor: C.surface,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.line,
      borderLeftWidth: 3,
      borderLeftColor: accentColor,
      overflow: 'hidden',
    }}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1, marginRight: 8 }} numberOfLines={2}>
            {isCommercial
              ? (es ? 'Limpieza Comercial' : 'Commercial Cleaning')
              : (es ? 'Limpieza Residencial' : 'Residential Cleaning')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <StatusDot status={job.status} />
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_500Medium' }}>
              {job.status === 'open' ? (es ? 'Abierto' : 'Open') :
               job.status === 'accepted' ? (es ? 'Asignado' : 'Assigned') :
               job.status === 'in_progress' ? (es ? 'En Progreso' : 'In Progress') :
               job.status === 'completed' ? (es ? 'Completado' : 'Completed') :
               (es ? 'Expirado' : 'Expired')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="map-pin" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              {job.city}, {job.state}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="calendar" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              {formatDate(job.scheduled_date)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="clock" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              {job.estimated_hours}h
            </Text>
          </View>
        </View>

        {isRejected && (
          <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' }}>
            <Text style={{ color: C.danger, fontSize: 11, fontFamily: 'Inter_500Medium' }}>
              {es ? 'No seleccionado' : 'Not selected'}
            </Text>
          </View>
        )}
      </View>

      {/* Complete button for in_progress jobs */}
      {job.status === 'accepted' && onComplete && (
        <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
          <TouchableOpacity
            onPress={onComplete}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 }}
            activeOpacity={0.8}
          >
            <Feather name="check-circle" size={15} color={C.success} />
            <Text style={{ color: C.success, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
              {es ? 'Marcar como Completado' : 'Mark as Completed'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function MyJobsScreen() {
  const { user } = useAuthStore();
  const { lang } = useLang();
  const es = lang === 'es';
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [applied, setApplied] = useState<JobRequest[]>([]);
  const [active, setActive] = useState<JobRequest[]>([]);
  const [completed, setCompleted] = useState<JobRequest[]>([]);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [appStatuses, setAppStatuses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [completeJob, setCompleteJob] = useState<JobRequest | null>(null);

  const TAB_LABELS: Record<Tab, string> = {
    applied:   es ? 'Aplicados' : 'Applied',
    active:    es ? 'Activos' : 'Active',
    completed: es ? 'Completados' : 'Done',
  };

  const loadJobs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: apps, error: appsErr } = await supabase
        .from('job_applications')
        .select('job_request_id, status')
        .eq('provider_id', user.id);
      if (appsErr) throw appsErr;
      if (!apps?.length) {
        setApplied([]); setActive([]); setCompleted([]);
        return;
      }

      const statusMap: Record<string, string> = {};
      apps.forEach((a: any) => { statusMap[a.job_request_id] = a.status; });
      setAppStatuses(statusMap);

      const rejIds = new Set(apps.filter((a: any) => a.status === 'rejected').map((a: any) => a.job_request_id as string));
      setRejectedIds(rejIds);

      const jobIds = apps.map((a: any) => a.job_request_id);
      const { data: jobs, error: jobsErr } = await supabase
        .from('job_requests')
        .select('*')
        .in('id', jobIds)
        .order('created_at', { ascending: false });
      if (jobsErr) throw jobsErr;

      const allJobs = (jobs ?? []) as JobRequest[];
      setApplied(allJobs.filter((j) => statusMap[j.id] === 'pending' || statusMap[j.id] === 'rejected'));
      setActive(allJobs.filter((j) => statusMap[j.id] === 'accepted' && j.status !== 'completed'));
      setCompleted(allJobs.filter((j) => j.status === 'completed'));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadJobs(); }, [loadJobs]));

  const current = activeTab === 'applied' ? applied : activeTab === 'active' ? active : completed;
  const counts: Record<Tab, number> = { applied: applied.length, active: active.length, completed: completed.length };

  const renderItem = useCallback(({ item }: { item: JobRequest }) => (
    <JobCard
      job={item}
      appStatus={appStatuses[item.id]}
      isRejected={rejectedIds.has(item.id)}
      es={es}
      onComplete={activeTab === 'active' ? () => setCompleteJob(item) : undefined}
    />
  ), [appStatuses, rejectedIds, es, activeTab]);

  return (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 16 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold' }}>
          {es ? 'Mis Trabajos' : 'My Jobs'}
        </Text>
        <Text style={{ color: C.textSecondary, fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {es ? 'Historial de tus trabajos' : 'Your job history'}
        </Text>
      </View>

      {/* Tabs */}
      <View style={{
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: C.surface,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: C.line,
      }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
                backgroundColor: isActive ? C.accent : 'transparent',
                flexDirection: 'row', justifyContent: 'center',
              }}
              activeOpacity={0.75}
            >
              <Text style={{
                fontSize: 12,
                fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                color: isActive ? '#FFF' : C.textSecondary,
              }}>
                {TAB_LABELS[tab]}
              </Text>
              {counts[tab] > 0 && (
                <View style={{
                  marginLeft: 5, width: 16, height: 16, borderRadius: 8,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : C.surface2,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 9, color: isActive ? '#FFF' : C.textSecondary, fontFamily: 'Inter_600SemiBold' }}>
                    {counts[tab]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : current.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: `${C.accent}12`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Feather name="briefcase" size={30} color={C.accent} />
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'center', marginBottom: 8 }}>
            {es ? `Sin trabajos ${TAB_LABELS[activeTab].toLowerCase()}` : `No ${TAB_LABELS[activeTab].toLowerCase()} jobs`}
          </Text>
          {activeTab === 'applied' && (
            <TouchableOpacity
              onPress={() => router.push('/(provider)/jobs' as any)}
              style={{ backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 4 }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Buscar Trabajos' : 'Browse Jobs'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={current}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CompleteModal
        job={completeJob}
        visible={!!completeJob}
        es={es}
        onClose={() => setCompleteJob(null)}
        onCompleted={() => { loadJobs(); }}
      />
    </View>
  );
}
