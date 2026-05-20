import { View, Text } from 'react-native';
import ScreenWrapper from '@/components/layout/ScreenWrapper';

const DEMO_NOTIFICATIONS = [
  { id: '1', icon: '💼', title: 'New Job Alert — Office Deep Clean',  sub: 'Commercial · Miami, FL · $150–$200 · 2 min ago',  read: false },
  { id: '2', icon: '💼', title: 'New Job Alert — House Cleaning',     sub: 'Residential · Miami Beach, FL · $80–$120 · 20 min ago', read: false },
  { id: '3', icon: '✅', title: 'Your profile was approved',          sub: 'You can now bid on jobs · 2 days ago',               read: true },
  { id: '4', icon: '📄', title: 'Document review complete',           sub: 'W-9 and Insurance approved · 3 days ago',            read: true },
];

export default function ProviderNotifications() {
  const unread = DEMO_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <ScreenWrapper>
      <View className="px-5 pt-8 pb-4">
        <Text className="text-primary text-3xl font-heading">Notifications</Text>
        <Text className="text-text-muted font-body text-sm mt-0.5">
          {unread > 0 ? `${unread} unread` : 'All caught up'}
        </Text>
      </View>

      <View className="px-5">
        {DEMO_NOTIFICATIONS.map((n, idx) => (
          <View
            key={n.id}
            className={`flex-row items-start py-4 ${idx < DEMO_NOTIFICATIONS.length - 1 ? 'border-b border-gray-100' : ''}`}
          >
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${n.read ? 'bg-gray-100' : 'bg-primary/10'}`}>
              <Text className="text-lg">{n.icon}</Text>
            </View>
            <View className="flex-1">
              <Text className={`text-sm mb-0.5 ${n.read ? 'text-text-muted font-body' : 'text-text-main font-body-bold'}`}>
                {n.title}
              </Text>
              <Text className="text-text-muted font-body text-xs leading-4">{n.sub}</Text>
            </View>
            {!n.read && (
              <View className="w-2 h-2 bg-secondary rounded-full mt-1.5 ml-2" />
            )}
          </View>
        ))}
      </View>
    </ScreenWrapper>
  );
}
