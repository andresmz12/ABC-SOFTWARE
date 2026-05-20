import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import { DEMO_REQUESTS } from '@/constants/demoData';

export default function ClientHome() {
  const { t } = useTranslation();
  const router = useRouter();

  const openCount = DEMO_REQUESTS.filter((r) => r.status === 'open').length;
  const totalBids = DEMO_REQUESTS.reduce((s, r) => s + r.bidsCount, 0);

  return (
    <ScreenWrapper scroll className="px-5">
      <View className="pt-8 pb-6">
        <Text className="text-text-muted font-body text-sm">Welcome back 👋</Text>
        <Text className="text-primary text-3xl font-heading mt-0.5">Find a Professional</Text>
      </View>

      {/* Active request summary */}
      {openCount > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/(client)/my-requests' as any)}
          className="bg-accent border border-primary/20 rounded-2xl p-4 mb-4 flex-row items-center"
          style={{ shadowColor: '#1B3A6B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 }}
        >
          <View className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center mr-3">
            <Text className="text-lg">📋</Text>
          </View>
          <View className="flex-1">
            <Text className="text-primary font-body-bold text-sm">
              {openCount} active request{openCount > 1 ? 's' : ''}
            </Text>
            <Text className="text-text-muted font-body text-xs mt-0.5">
              {totalBids} bid{totalBids !== 1 ? 's' : ''} received · tap to review
            </Text>
          </View>
          <Text className="text-primary text-lg">→</Text>
        </TouchableOpacity>
      )}

      {/* Post job CTA */}
      <TouchableOpacity
        onPress={() => router.push('/(client)/post-job' as any)}
        className="bg-primary rounded-2xl p-6 mb-4"
        style={{ shadowColor: '#1B3A6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 }}
        activeOpacity={0.9}
      >
        <Text className="text-secondary font-body text-sm mb-1">Ready for a clean space?</Text>
        <Text className="text-white text-2xl font-heading">Post a Cleaning Job</Text>
        <Text className="text-white/70 font-body text-sm mt-2 leading-5">
          Get bids from verified, insured professionals in your area within minutes.
        </Text>
        <View className="bg-secondary rounded-xl py-3 px-5 mt-4 self-start">
          <Text className="text-white font-body-bold text-sm">Get Started →</Text>
        </View>
      </TouchableOpacity>

      {/* Browse providers card */}
      <TouchableOpacity
        onPress={() => router.push('/(client)/browse-providers' as any)}
        className="bg-white border border-gray-100 rounded-2xl p-5 mb-4 flex-row items-center"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 }}
        activeOpacity={0.85}
      >
        <View className="flex-1">
          <Text className="text-text-main font-body-bold text-base mb-0.5">Browse Providers</Text>
          <Text className="text-text-muted font-body text-sm">View profiles, ratings & availability</Text>
        </View>
        <View className="w-12 h-12 bg-accent rounded-2xl items-center justify-center ml-3">
          <Text className="text-2xl">🔍</Text>
        </View>
      </TouchableOpacity>

      {/* Trust indicators */}
      <View className="bg-white border border-gray-100 rounded-2xl p-4 mb-6" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
        <Text className="text-text-main font-body-bold text-sm mb-3">Why ProVendor?</Text>
        {[
          { icon: '✅', text: 'All providers verified & background checked' },
          { icon: '🛡️', text: 'Insured professionals — your property is protected' },
          { icon: '⭐', text: 'Genuine reviews from real clients' },
        ].map((item) => (
          <View key={item.text} className="flex-row items-center mb-2 last:mb-0">
            <Text className="mr-2 text-base">{item.icon}</Text>
            <Text className="text-text-muted font-body text-xs flex-1">{item.text}</Text>
          </View>
        ))}
      </View>
    </ScreenWrapper>
  );
}
