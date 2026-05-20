import { View, Text } from 'react-native';

type Status = 'pending' | 'approved' | 'rejected' | 'expired' | 'suspended' | 'open' | 'in_progress' | 'completed' | 'cancelled' | 'accepted' | 'withdrawn';

const styles: Record<Status, { bg: string; text: string; label: string }> = {
  pending:     { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  approved:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Approved' },
  rejected:    { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Rejected' },
  expired:     { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Expired' },
  suspended:   { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Suspended' },
  open:        { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Open' },
  in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'In Progress' },
  completed:   { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Completed' },
  cancelled:   { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Cancelled' },
  accepted:    { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Accepted' },
  withdrawn:   { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Withdrawn' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const s = styles[status] ?? styles.pending;
  return (
    <View className={`${s.bg} px-3 py-1 rounded-full self-start`}>
      <Text className={`${s.text} text-xs font-body-medium`}>{s.label}</Text>
    </View>
  );
}
