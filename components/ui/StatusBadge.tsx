import { View, Text } from 'react-native';

type Status =
  | 'pending' | 'approved' | 'rejected' | 'expired'
  | 'suspended' | 'open' | 'in_progress' | 'completed'
  | 'cancelled' | 'accepted' | 'withdrawn';

const META: Record<Status, { bg: string; border: string; text: string; label: string }> = {
  pending:     { bg: '#FFF3CD', border: '#F59E0B60', text: '#856404', label: 'PENDING' },
  approved:    { bg: '#D1FAE5', border: '#06D6A060', text: '#065F46', label: 'APPROVED' },
  rejected:    { bg: '#FFE4E6', border: '#EF476F60', text: '#9B1C1C', label: 'REJECTED' },
  expired:     { bg: '#F3F4F6', border: '#6B728060', text: '#6B7280', label: 'EXPIRED' },
  suspended:   { bg: '#FFF3CD', border: '#F59E0B60', text: '#856404', label: 'SUSPENDED' },
  open:        { bg: '#E0F7FA', border: '#007A9A60', text: '#007A9A', label: 'OPEN' },
  in_progress: { bg: '#E0F7FA', border: '#0077B660', text: '#0077B6', label: 'IN PROGRESS' },
  completed:   { bg: '#D1FAE5', border: '#06D6A060', text: '#065F46', label: 'COMPLETED' },
  cancelled:   { bg: '#F3F4F6', border: '#6B728060', text: '#6B7280', label: 'CANCELLED' },
  accepted:    { bg: '#D1FAE5', border: '#06D6A060', text: '#065F46', label: 'ACCEPTED' },
  withdrawn:   { bg: '#F3F4F6', border: '#6B728060', text: '#6B7280', label: 'WITHDRAWN' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const m = META[status] ?? META.pending;
  return (
    <View style={{
      backgroundColor: m.bg,
      borderWidth: 1,
      borderColor: m.border,
      borderRadius: 9999,
      paddingHorizontal: 8,
      paddingVertical: 3,
      alignSelf: 'flex-start',
    }}>
      <Text style={{
        color: m.text,
        fontSize: 10,
        fontFamily: 'Inter_600SemiBold',
        letterSpacing: 0.5,
      }}>
        {m.label}
      </Text>
    </View>
  );
}
