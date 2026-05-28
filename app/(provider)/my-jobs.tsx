/**
 * Provider — My Jobs
 * Shows the provider's job history with tabs: Applied, Active, Completed
 * Includes: mark as completed (with photo requirement), trigger rating modal for client
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Alert, Modal,
  ScrollView, ActivityIndicator, Image, TextInput, Platform,
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
  userId: string;
  onClose: () => void;
  onCompleted: () => void;
}

// ─── Start Modal ──────────────────────────────────────────────────────────────

interface StartModalProps {
  job: JobRequest | null;
  visible: boolean;
  es: boolean;
  userId: string;
  onClose: () => void;
  onStarted: () => void;
}

function StartModal({ job, visible, es, userId, onClose, onStarted }: StartModalProps) {
  const [photo, setPhoto] = useState<{ uri: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!visible) setPhoto(null); }, [visible]);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, name: asset.fileName ?? `start_${Date.now()}.jpg` });
    }
  };

  const handleStart = async () => {
    if (!job) return;
    if (!photo) {
      Alert.alert(
        es ? 'Foto requerida' : 'Photo required',
        es
          ? 'Sube una foto del sitio antes de iniciar el trabajo.'
          : 'Please upload a before photo before starting the job.',
      );
      return;
    }
    setSaving(true);
    try {
      const ext = photo.name.split('.').pop() ?? 'jpg';
      const path = `${userId}/${job.id}/start/${Date.now()}.${ext}`;
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const { error: uploadErr } = await supabase.storage
        .from('job-photos')
        .upload(path, blob, { contentType: `image/${ext}`, upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(path);

      const { error } = await supabase
        .from('job_requests')
        .update({
          status: 'in_progress',
          start_photo_url: urlData.publicUrl,
          started_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      if (error) throw error;

      // Notify client that work has started (fire-and-forget)
      if (job.client_id) {
        const cityEn = job.city ? ` in ${job.city}` : '';
        const cityEs = job.city ? ` en ${job.city}` : '';
        const svcEn = job.service_type === 'commercial' ? 'Commercial Cleaning' : 'Residential Cleaning';
        const svcEs = job.service_type === 'commercial' ? 'Limpieza Comercial' : 'Limpieza Residencial';
        supabase.from('notifications').insert({
          user_id: job.client_id,
          title_en: 'Work Has Started',
          title_es: 'El Trabajo Comenzó',
          body_en: `Your provider has started the ${svcEn}${cityEn}.`,
          body_es: `Tu proveedor ha iniciado la ${svcEs}${cityEs}.`,
          type: 'job_started',
          data: { job_id: job.id },
        }).then(() => {});
      }

      setPhoto(null);
      onStarted();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
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
              {es ? 'Iniciar Trabajo' : 'Start Job'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20, lineHeight: 21 }}>
            {es
              ? 'Sube una foto del lugar antes de comenzar el trabajo.'
              : 'Upload a before photo of the site to start the job.'}
          </Text>

          {photo ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <Image source={{ uri: photo.uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.textPrimary, fontSize: 13, fontFamily: 'Inter_500Medium' }} numberOfLines={1}>
                  {photo.name}
                </Text>
                <TouchableOpacity onPress={() => setPhoto(null)} style={{ marginTop: 6 }}>
                  <Text style={{ color: C.danger, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                    {es ? 'Eliminar' : 'Remove'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity
                onPress={pickPhoto}
                style={{
                  height: 100, borderRadius: 12,
                  borderWidth: 2, borderColor: C.line, borderStyle: 'dashed',
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: C.surface2, marginBottom: 16,
                }}
              >
                <Feather name="camera" size={26} color={C.textMuted} />
                <Text style={{ color: C.textMuted, fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 8 }}>
                  {es ? 'Seleccionar foto' : 'Select photo'}
                </Text>
              </TouchableOpacity>
              <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'flex-start' }}>
                <Feather name="alert-triangle" size={16} color={C.warning} style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={{ color: '#92400E', fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 19 }}>
                  {es ? 'Se requiere una foto antes de iniciar.' : 'A before photo is required to start.'}
                </Text>
              </View>
            </>
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
              onPress={handleStart}
              disabled={saving}
              style={{ flex: 2, height: 52, borderRadius: 12, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.7 : 1 }}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Iniciar Trabajo' : 'Start Job'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Complete Modal ────────────────────────────────────────────────────────────

function CompleteModal({ job, visible, es, userId, onClose, onCompleted }: CompleteModalProps) {
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
      let completionPhotoUrl: string | null = null;

      for (const photo of photos) {
        const ext = photo.name.split('.').pop() ?? 'jpg';
        const path = `${userId}/${job.id}/after/${Date.now()}.${ext}`;
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        const { error: uploadErr } = await supabase.storage
          .from('job-photos')
          .upload(path, blob, { contentType: `image/${ext}`, upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(path);
          afterUrls.push(urlData.publicUrl);
          if (!completionPhotoUrl) completionPhotoUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase
        .from('job_requests')
        .update({
          status: 'completed',
          photos_after: afterUrls,
          completion_photo_url: completionPhotoUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      if (error) throw error;

      // Notify client that work is complete (fire-and-forget)
      if (job.client_id) {
        const cityEn = job.city ? ` in ${job.city}` : '';
        const cityEs = job.city ? ` en ${job.city}` : '';
        const svcEn = job.service_type === 'commercial' ? 'Commercial Cleaning' : 'Residential Cleaning';
        const svcEs = job.service_type === 'commercial' ? 'Limpieza Comercial' : 'Limpieza Residencial';
        supabase.from('notifications').insert({
          user_id: job.client_id,
          title_en: 'Job Completed',
          title_es: 'Trabajo Completado',
          body_en: `The ${svcEn}${cityEn} has been completed. Please review the work.`,
          body_es: `La ${svcEs}${cityEs} ha sido completada. Por favor revisa el trabajo.`,
          type: 'job_completed',
          data: { job_id: job.id },
        }).then(() => {});
      }

      setPhotos([]);
      onCompleted();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
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

// ─── Rating Modal ────────────────────────────────────────────────────────────

interface RatingModalProps {
  job: JobRequest | null;
  visible: boolean;
  es: boolean;
  onClose: () => void;
  providerId: string;
}

function RatingModal({ job, visible, es, onClose, providerId }: RatingModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!job) return;
    setSaving(true);
    try {
      await supabase.from('reviews').insert({
        job_id: job.id,
        provider_id: providerId,
        client_id: (job as any).client_id ?? null,
        rating,
        comment: comment.trim() || null,
      });
      setRating(5);
      setComment('');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', es ? 'No se pudo enviar la calificación. Inténtalo de nuevo.' : 'Failed to submit rating. Please try again.');
    } finally {
      setSaving(false);
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
              {es ? 'Calificar Cliente' : 'Rate Client'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20, lineHeight: 21 }}>
            {es ? '¿Cómo fue tu experiencia con este cliente?' : 'How was your experience with this client?'}
          </Text>

          {/* Star rating */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Text style={{ fontSize: 38, color: star <= rating ? '#F59E0B' : C.line }}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Optional comment */}
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={es ? 'Comentario opcional...' : 'Optional comment...'}
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: C.surface2,
              borderRadius: 12,
              padding: 14,
              color: C.textPrimary,
              fontSize: 14,
              fontFamily: 'Inter_400Regular',
              marginBottom: 20,
              minHeight: 80,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: C.line,
            }}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>
                {es ? 'Omitir' : 'Skip'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={{ flex: 2, height: 52, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.7 : 1 }}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>
                  {es ? 'Enviar Calificación' : 'Submit Rating'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Dispute Modal ────────────────────────────────────────────────────────────

function DisputeModal({ job, visible, es, userId, onClose, onSubmitted }: {
  job: JobRequest | null;
  visible: boolean;
  es: boolean;
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!visible) { setReason(''); setDescription(''); } }, [visible]);

  const handleSubmit = async () => {
    if (!job) return;
    if (!reason.trim()) {
      Alert.alert(es ? 'Requerido' : 'Required', es ? 'Escribe la razón de la disputa.' : 'Please enter a reason for the dispute.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from('disputes').insert({
        job_request_id: job.id,
        opened_by: userId,
        reason: reason.trim(),
        description: description.trim() || null,
        status: 'open',
      });
      if (error) throw error;
      onSubmitted();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(13,27,42,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: C.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: C.textPrimary, fontSize: 20, fontFamily: 'Inter_700Bold' }}>
              {es ? 'Abrir Disputa' : 'Open Dispute'}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ width: 36, height: 36, backgroundColor: C.surface2, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 16, lineHeight: 20 }}>
            {es
              ? 'Describe el problema con este trabajo. El equipo de soporte revisará tu disputa.'
              : 'Describe the issue with this job. Our support team will review your dispute.'}
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={es ? 'Razón de la disputa *' : 'Reason for dispute *'}
            placeholderTextColor={C.textMuted}
            style={{ backgroundColor: C.surface2, borderRadius: 10, padding: 14, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 12, borderWidth: 1, borderColor: C.line }}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={es ? 'Descripción adicional (opcional)' : 'Additional description (optional)'}
            placeholderTextColor={C.textMuted}
            multiline
            numberOfLines={3}
            style={{ backgroundColor: C.surface2, borderRadius: 10, padding: 14, color: C.textPrimary, fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: C.line }}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: C.textSecondary, fontSize: 15, fontFamily: 'Inter_500Medium' }}>{es ? 'Cancelar' : 'Cancel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={{ flex: 2, height: 52, borderRadius: 12, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.7 : 1 }}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' }}>{es ? 'Enviar Disputa' : 'Submit Dispute'}</Text>
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
  onPress,
  onStart,
  onComplete,
  onWithdraw,
  onDispute,
}: {
  job: JobRequest;
  appStatus?: string;
  isRejected: boolean;
  es: boolean;
  onPress?: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onWithdraw?: () => void;
  onDispute?: () => void;
}) {
  const isCommercial = job.service_type === 'commercial';
  const accentColor = isCommercial ? C.accent2 : C.accent;

  const inner = (
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

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="map-pin" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              {job.city}{job.state ? `, ${job.state}` : ''}
            </Text>
          </View>
          {(job as any).address ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="home" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
              <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }} numberOfLines={1}>
                {(job as any).address}
              </Text>
            </View>
          ) : null}
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
          {((job as any).budget_usd || (job as any).budget_cop) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="dollar-sign" size={11} color={C.textMuted} style={{ marginRight: 4 }} />
              <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
                {(job as any).budget_usd
                  ? `$${Number((job as any).budget_usd).toLocaleString('en-US')}`
                  : `$${Number((job as any).budget_cop).toLocaleString('es-CO')} COP`}
              </Text>
            </View>
          ) : null}
        </View>

        {isRejected && (
          <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' }}>
            <Text style={{ color: C.danger, fontSize: 11, fontFamily: 'Inter_500Medium' }}>
              {es ? 'No seleccionado' : 'Not selected'}
            </Text>
          </View>
        )}

        {onPress && (
          <View style={{ position: 'absolute', right: 14, bottom: 14 }}>
            <Feather name="chevron-right" size={16} color={C.textMuted} />
          </View>
        )}
      </View>

      {/* Action buttons — Start Job / Complete Job / Withdraw / Dispute */}
      {((job.status === 'accepted' && onStart) || (job.status === 'in_progress' && onComplete) || (appStatus === 'pending' && onWithdraw) || ((job.status === 'in_progress' || job.status === 'completed') && onDispute)) ? (
        <View style={{ borderTopWidth: 1, borderTopColor: C.line }}>
          {job.status === 'accepted' && onStart && (
            <TouchableOpacity
              onPress={onStart}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 }}
              activeOpacity={0.8}
            >
              <Feather name="play" size={15} color="#3B82F6" />
              <Text style={{ color: '#3B82F6', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Iniciar Trabajo' : 'Start Job'}
              </Text>
            </TouchableOpacity>
          )}
          {job.status === 'in_progress' && onComplete && (
            <TouchableOpacity
              onPress={onComplete}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 }}
              activeOpacity={0.8}
            >
              <Feather name="check-circle" size={15} color={C.success} />
              <Text style={{ color: C.success, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Completar Trabajo' : 'Complete Job'}
              </Text>
            </TouchableOpacity>
          )}
          {appStatus === 'pending' && onWithdraw && (
            <TouchableOpacity
              onPress={onWithdraw}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 }}
              activeOpacity={0.8}
            >
              <Feather name="x-circle" size={15} color={C.danger} />
              <Text style={{ color: C.danger, fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>
                {es ? 'Retirar Aplicación' : 'Withdraw Application'}
              </Text>
            </TouchableOpacity>
          )}
          {(job.status === 'in_progress' || job.status === 'completed') && onDispute && (
            <TouchableOpacity
              onPress={onDispute}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6, borderTopWidth: 1, borderTopColor: C.line }}
              activeOpacity={0.8}
            >
              <Feather name="alert-triangle" size={13} color={C.danger} />
              <Text style={{ color: C.danger, fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                {es ? 'Abrir Disputa' : 'Open Dispute'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
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
  const [startJob, setStartJob] = useState<JobRequest | null>(null);
  const [completeJob, setCompleteJob] = useState<JobRequest | null>(null);
  const [ratingJob, setRatingJob] = useState<JobRequest | null>(null);
  const [disputeJob, setDisputeJob] = useState<JobRequest | null>(null);

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
      // Active = application accepted AND job not yet completed/cancelled/expired
      // Sorted by scheduled_date ascending so most urgent comes first
      // Active = job status is accepted OR in_progress, and provider application not rejected
      const activeList = allJobs
        .filter((j) => {
          const appStatus = statusMap[j.id];
          return (
            (j.status === 'accepted' || j.status === 'in_progress') &&
            appStatus != null && appStatus !== 'rejected'
          );
        })
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime());
      setActive(activeList);
      setCompleted(allJobs.filter((j) => j.status === 'completed'));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadJobs(); }, [loadJobs]));

  const handleWithdraw = useCallback((job: JobRequest) => {
    Alert.alert(
      es ? 'Retirar Aplicación' : 'Withdraw Application',
      es
        ? '¿Estás seguro que deseas retirar tu aplicación para este trabajo?'
        : 'Are you sure you want to withdraw your application for this job?',
      [
        { text: es ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: es ? 'Retirar' : 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('job_applications')
                .delete()
                .eq('provider_id', user!.id)
                .eq('job_request_id', job.id);
              if (error) throw error;
              await loadJobs();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  }, [es, user, loadJobs]);

  const current = activeTab === 'applied' ? applied : activeTab === 'active' ? active : completed;
  const counts: Record<Tab, number> = { applied: applied.length, active: active.length, completed: completed.length };

  const renderItem = useCallback(({ item }: { item: JobRequest }) => (
    <JobCard
      job={item}
      appStatus={appStatuses[item.id]}
      isRejected={rejectedIds.has(item.id)}
      es={es}
      onPress={() => router.push({ pathname: '/(provider)/job-detail', params: { jobId: item.id } } as any)}
      onStart={activeTab === 'active' ? () => setStartJob(item) : undefined}
      onComplete={activeTab === 'active' ? () => setCompleteJob(item) : undefined}
      onWithdraw={activeTab === 'applied' && appStatuses[item.id] === 'pending' ? () => handleWithdraw(item) : undefined}
      onDispute={(activeTab === 'active' || activeTab === 'completed') ? () => setDisputeJob(item) : undefined}
    />
  ), [appStatuses, rejectedIds, es, activeTab, router, handleWithdraw]);

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

      <StartModal
        job={startJob}
        visible={!!startJob}
        es={es}
        userId={user?.id ?? ''}
        onClose={() => setStartJob(null)}
        onStarted={() => {
          setStartJob(null);
          loadJobs();
        }}
      />
      <CompleteModal
        job={completeJob}
        visible={!!completeJob}
        es={es}
        userId={user?.id ?? ''}
        onClose={() => setCompleteJob(null)}
        onCompleted={() => {
          setRatingJob(completeJob);
          loadJobs();
        }}
      />
      <RatingModal
        job={ratingJob}
        visible={!!ratingJob}
        es={es}
        onClose={() => setRatingJob(null)}
        providerId={user?.id ?? ''}
      />
      <DisputeModal
        job={disputeJob}
        visible={!!disputeJob}
        es={es}
        userId={user?.id ?? ''}
        onClose={() => setDisputeJob(null)}
        onSubmitted={() => {
          Alert.alert(
            es ? 'Disputa enviada' : 'Dispute submitted',
            es ? 'Tu disputa fue enviada al equipo de soporte.' : 'Your dispute has been sent to our support team.',
          );
        }}
      />
    </View>
  );
}
