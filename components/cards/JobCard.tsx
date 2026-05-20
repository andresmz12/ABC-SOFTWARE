import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import StatusBadge from '@/components/ui/StatusBadge';
import type { JobRequest } from '@/types';

interface Props {
  job: JobRequest;
  onPress: () => void;
}

export default function JobCard({ job, onPress }: Props) {
  const { t } = useTranslation();
  const budget = job.budget_usd ? `$${job.budget_usd.toFixed(2)} USD` : job.budget_cop ? `$${job.budget_cop.toLocaleString()} COP` : t('common.noResults');
  return (
    <TouchableOpacity onPress={onPress} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-2">
        <View className={`px-3 py-1 rounded-full ${job.service_type === 'commercial' ? 'bg-blue-100' : 'bg-green-100'}`}>
          <Text className={`text-xs font-body-medium ${job.service_type === 'commercial' ? 'text-blue-700' : 'text-green-700'}`}>
            {job.service_type === 'commercial' ? t('jobs.commercial') : t('jobs.residential')}
          </Text>
        </View>
        <StatusBadge status={job.status} />
      </View>
      <Text className="text-text-main font-body-bold text-base mb-1">{job.city}, {job.state}</Text>
      <Text className="text-text-muted font-body text-sm mb-2">{job.scheduled_date} • {job.estimated_hours}h • {budget}</Text>
      {job.description && (
        <Text className="text-text-muted font-body text-sm" numberOfLines={2}>{job.description}</Text>
      )}
    </TouchableOpacity>
  );
}
