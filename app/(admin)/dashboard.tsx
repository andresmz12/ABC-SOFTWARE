import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';

const STATS = [
  { label: 'Pending Approvals', value: '12', icon: '⏳', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  { label: 'Active Jobs',       value: '8',  icon: '💼', bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700' },
  { label: 'Total Clients',     value: '47', icon: '👥', bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700' },
  { label: 'Revenue (MTD)',     value: '$2,840', icon: '💰', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
];

const ACTIVITY = [
  { id: '1', icon: '✅', text: 'Maria Gonzalez approved',             sub: '2 min ago',   color: 'text-green-600' },
  { id: '2', icon: '📄', text: 'CleanPro submitted 2 documents',      sub: '18 min ago',  color: 'text-blue-600' },
  { id: '3', icon: '💼', text: 'New job posted — Office Deep Clean',  sub: '32 min ago',  color: 'text-primary' },
  { id: '4', icon: '❌', text: 'Juan Reyes license rejected',          sub: '1h 10m ago',  color: 'text-red-600' },
  { id: '5', icon: '🆕', text: 'Sparkle Clean Co. registered',        sub: '2h 5m ago',   color: 'text-indigo-600' },
];

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <ScreenWrapper scroll className="px-5">
      <View className="pt-8 pb-6">
        <Text className="text-text-muted font-body text-sm">Admin Panel</Text>
        <Text className="text-primary text-3xl font-heading mt-0.5">Dashboard</Text>
        <Text className="text-text-muted font-body text-sm mt-1">Platform overview · May 20, 2025</Text>
      </View>

      {/* Stats grid */}
      <View className="flex-row flex-wrap gap-3 mb-6">
        {STATS.map((stat) => (
          <View
            key={stat.label}
            className={`${stat.bg} border ${stat.border} rounded-2xl p-4 flex-1`}
            style={{ minWidth: '45%' }}
          >
            <Text className="text-2xl mb-2">{stat.icon}</Text>
            <Text className={`${stat.text} text-2xl font-heading`}>{stat.value}</Text>
            <Text className="text-text-muted font-body text-xs mt-1">{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick actions */}
      <Text className="text-text-main font-body-bold text-base mb-3">Quick Actions</Text>
      <View className="flex-row gap-3 mb-6">
        <TouchableOpacity
          onPress={() => router.push('/(admin)/providers' as any)}
          className="flex-1 bg-primary rounded-2xl p-4 items-center"
          style={{ shadowColor: '#1B3A6B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }}
        >
          <Text className="text-2xl mb-1">🏢</Text>
          <Text className="text-white font-body-bold text-xs text-center">Review Providers</Text>
          <View className="bg-secondary/80 mt-2 px-2 py-0.5 rounded-full">
            <Text className="text-white text-xs font-body-bold">12 pending</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/documents' as any)}
          className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 items-center"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 }}
        >
          <Text className="text-2xl mb-1">📄</Text>
          <Text className="text-text-main font-body-bold text-xs text-center">Review Docs</Text>
          <View className="bg-yellow-100 mt-2 px-2 py-0.5 rounded-full">
            <Text className="text-yellow-700 text-xs font-body-bold">3 queued</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/jobs' as any)}
          className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 items-center"
          style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 }}
        >
          <Text className="text-2xl mb-1">💼</Text>
          <Text className="text-text-main font-body-bold text-xs text-center">Active Jobs</Text>
          <View className="bg-blue-100 mt-2 px-2 py-0.5 rounded-full">
            <Text className="text-blue-700 text-xs font-body-bold">8 active</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Recent activity */}
      <Text className="text-text-main font-body-bold text-base mb-3">Recent Activity</Text>
      <View
        className="bg-white border border-gray-100 rounded-2xl mb-8 overflow-hidden"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 }}
      >
        {ACTIVITY.map((item, idx) => (
          <View
            key={item.id}
            className={`flex-row items-center px-4 py-3.5 ${idx < ACTIVITY.length - 1 ? 'border-b border-gray-50' : ''}`}
          >
            <Text className="text-lg mr-3">{item.icon}</Text>
            <View className="flex-1">
              <Text className="text-text-main font-body-medium text-sm">{item.text}</Text>
              <Text className="text-text-muted font-body text-xs mt-0.5">{item.sub}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScreenWrapper>
  );
}
