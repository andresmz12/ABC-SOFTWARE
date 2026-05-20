import { View, Text, TouchableOpacity } from 'react-native';
import { formatUSD, formatCOP } from '@/lib/countryData';
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
  const leftBorder = isCommercial ? '#1B3A6B' : '#C9A84C';

  const budgetText = job.budget_usd
    ? job.budget_max_usd ? `${formatUSD(job.budget_usd)}–${formatUSD(job.budget_max_usd)}` : formatUSD(job.budget_usd)
    : job.budget_cop
    ? job.budget_max_cop ? `${formatCOP(job.budget_cop)}–${formatCOP(job.budget_max_cop)}` : formatCOP(job.budget_cop)
    : null;

  const copUsdEquiv = isColombia && job.budget_cop
    ? `≈ ${formatUSD(job.budget_cop / 4100)}`
    : null;

  const timer = job.expires_at ? countdown(job.expires_at) : null;

  const location = isColombia
    ? `${job.county ? job.county + ', ' : ''}${job.city}`
    : `${job.city}, ${job.state}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ borderLeftWidth: 4, borderLeftColor: leftBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 }}
      className="bg-white rounded-2xl mb-3 overflow-hidden"
    >
      <View className="p-4">
        {/* Title + countdown */}
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-sm mr-1.5">{isColombia ? '🇨🇴' : '🇺🇸'}</Text>
            <Text className="text-text-main font-body-bold text-base flex-1" numberOfLines={1}>
              {job.title ?? (isCommercial ? 'Commercial Cleaning' : 'Residential Cleaning')}
            </Text>
          </View>
          {timer && (
            <View className={`px-2 py-0.5 rounded-full ${timer.urgent ? 'bg-red-100' : 'bg-gray-100'}`}>
              <Text className={`text-xs font-body-medium ${timer.urgent ? 'text-red-600' : 'text-text-muted'}`}>
                ⏱ {timer.text}
              </Text>
            </View>
          )}
        </View>

        {/* Service type + location */}
        <View className="flex-row items-center gap-2 mb-3">
          <View className={`px-2 py-0.5 rounded-full ${isCommercial ? 'bg-blue-100' : 'bg-amber-100'}`}>
            <Text className={`text-xs font-body-medium ${isCommercial ? 'text-blue-700' : 'text-amber-700'}`}>
              {isCommercial ? '🏢 Commercial' : '🏠 Residential'}
            </Text>
          </View>
          <Text className="text-text-muted font-body text-xs">📍 {location}</Text>
        </View>

        {/* Budget pill + hours + posted */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            {budgetText && (
              <View className="bg-secondary/10 px-3 py-1 rounded-full">
                <Text className="text-secondary font-body-bold text-sm">{budgetText}</Text>
              </View>
            )}
            {copUsdEquiv && (
              <Text className="text-text-muted font-body text-xs">{copUsdEquiv}</Text>
            )}
            <Text className="text-text-muted font-body text-xs">{job.estimated_hours}h</Text>
          </View>
          <Text className="text-text-muted font-body text-xs">{timeAgo(job.created_at)}</Text>
        </View>
      </View>

      {/* Full-width Apply button */}
      <View className="bg-primary px-4 py-3 items-center">
        <Text className="text-white font-body-bold text-sm tracking-wide">
          {isColombia ? 'Aplicar Ahora' : 'Apply Now'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
