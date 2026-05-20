import { View, Text } from 'react-native';

type Status =
  | 'pending' | 'approved' | 'rejected' | 'expired'
  | 'suspended' | 'open' | 'in_progress' | 'completed'
  | 'cancelled' | 'accepted' | 'withdrawn';

const META: Record<Status, { bg: string; border: string; text: string; label: string }> = {
  pending:     { bg: '#F59E0B18', border: '#F59E0B60', text: '#F59E0B', label: 'PENDING' },
  approved:    { bg: '#22C55E18', border: '#22C55E60', text: '#22C55E', label: 'APPROVED' },
  rejected:    { bg: '#EF444418', border: '#EF444460', text: '#EF4444', label: 'REJECTED' },
  expired:     { bg: '#52525218', border: '#52525260', text: '#525252', label: 'EXPIRED' },
  suspended:   { bg: '#F59E0B18', border: '#F59E0B60', text: '#F59E0B', label: 'SUSPENDED' },
  open:        { bg: '#C9A84C18', border: '#C9A84C60', text: '#C9A84C', label: 'OPEN' },
  in_progress: { bg: '#3B82F618', border: '#3B82F660', text: '#3B82F6', label: 'IN PROGRESS' },
  completed:   { bg: '#22C55E18', border: '#22C55E60', text: '#22C55E', label: 'COMPLETED' },
  cancelled:   { bg: '#52525218', border: '#52525260', text: '#525252', label: 'CANCELLED' },
  accepted:    { bg: '#22C55E18', border: '#22C55E60', text: '#22C55E', label: 'ACCEPTED' },
  withdrawn:   { bg: '#52525218', border: '#52525260', text: '#525252', label: 'WITHDRAWN' },
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
