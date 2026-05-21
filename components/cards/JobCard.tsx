import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatUSD, formatCOP } from '@/lib/countryData';
import { C } from '@/constants/theme';
import type { JobRequest } from '@/types';

interface Props {
  job: JobRequest;
  onPress: () => void;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function countdown(iso: string): { text: string; urgent: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: 'Expired', urgent: true };
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return { text: h > 0 ? `${h}h ${m}m left` : `${m}m left`, urgent: totalMins < 30 };
}

export default function JobCard({ job, onPress }: Props) {
  const isCommercial = job.service_type === 'commercial';
  const isColombia = job.country === 'colombia';
  const accentColor = isCommercial ? C.accent2 : C.accent;

  const budgetText = job.budget_usd
    ? job.budget_max_usd
      ? `${formatUSD(job.budget_usd)}–${formatUSD(job.budget_max_usd)}`
      : formatUSD(job.budget_usd)
    : job.budget_cop
    ? job.budget_max_cop
      ? `${formatCOP(job.budget_cop)}–${formatCOP(job.budget_max_cop)}`
      : formatCOP(job.budget_cop)
    : null;

  const timer = job.expires_at ? countdown(job.expires_at) : null;

  const location = isColombia
    ? `${(job as any).county ? (job as any).county + ', ' : ''}${job.city}`
    : `${job.city}, ${job.state}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      <View style={{ padding: 16 }}>
        {/* Title + timer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <Text
            style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', flex: 1, marginRight: 8 }}
            numberOfLines={1}
          >
            {(job as any).title ?? (isCommercial ? 'Commercial Cleaning' : 'Residential Cleaning')}
          </Text>
          {timer && (
            <View style={{
              backgroundColor: timer.urgent ? '#2d0d0d' : C.surface2,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: timer.urgent ? C.danger : C.line,
            }}>
              <Text style={{
                color: timer.urgent ? C.danger : C.textMuted,
                fontSize: 11,
                fontFamily: 'Inter_400Regular',
              }}>
                {timer.text}
              </Text>
            </View>
          )}
        </View>

        {/* Type + location */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <View style={{
            backgroundColor: isCommercial ? '#0d1a2d' : '#2d1a0d',
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: accentColor,
          }}>
            <Text style={{ color: accentColor, fontSize: 11, fontFamily: 'Inter_600SemiBold' }}>
              {isCommercial ? 'Commercial' : 'Residential'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="map-pin" size={11} color={C.textMuted} style={{ marginRight: 3 }} />
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_400Regular' }}>{location}</Text>
          </View>
        </View>

        {/* Budget + hours + time */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {budgetText && (
              <View style={{
                backgroundColor: C.surface2,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: C.accent,
              }}>
                <Text style={{ color: C.accent, fontSize: 13, fontFamily: 'Inter_700Bold' }}>{budgetText}</Text>
              </View>
            )}
            <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular' }}>
              {job.estimated_hours}h
            </Text>
          </View>
          <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
            {timeAgo(job.created_at)}
          </Text>
        </View>
      </View>

      {/* Apply button strip */}
      <View style={{
        backgroundColor: accentColor,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
      }}>
        <Text style={{
          color: isCommercial ? '#FFFFFF' : '#000000',
          fontSize: 13,
          fontFamily: 'Inter_600SemiBold',
          letterSpacing: 0.3,
          marginRight: 6,
        }}>
          {isColombia ? 'Aplicar Ahora' : 'Apply Now'}
        </Text>
        <Feather name="arrow-right" size={14} color={isCommercial ? '#FFFFFF' : '#000000'} />
      </View>
    </TouchableOpacity>
  );
}
