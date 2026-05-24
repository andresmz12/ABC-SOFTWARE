import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { useAuthStore } from '@/store/authStore';

const PAGE_SIZE = 10;

interface Provider {
  id: string;
  email: string;
  role: 'company' | 'independent';
  country: string;
  available: boolean;
  name: string;
  serviceType: string;
  city: string;
  state: string;
  avgRating: number | null;
  reviewCount: number;
}

const StarRating = React.memo(function StarRating({ rating, count, es }: { rating: number | null; count: number; es: boolean }) {
  if (rating === null || count === 0) {
    return (
      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>
        {es ? 'Sin reseñas' : 'No reviews'}
      </Text>
    );
  }
  const stars = Math.round(rating);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Feather
          key={s}
          name="star"
          size={11}
          color={s <= stars ? '#f5a623' : C.line}
          style={{ marginRight: 1 }}
        />
      ))}
      <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular', marginLeft: 4 }}>
        {rating.toFixed(1)} ({count})
      </Text>
    </View>
  );
});

const ProviderCard = React.memo(function ProviderCard({ provider, es, onPress }: { provider: Provider; es: boolean; onPress: () => void }) {
  const isCompany = provider.role === 'company';
  const roleLabel = isCompany
    ? (es ? 'Empresa de Limpieza' : 'Cleaning Company')
    : (es ? 'Limpiador Independiente' : 'Independent Cleaner');
  const serviceLabel = provider.serviceType === 'commercial'
    ? (es ? 'Comercial' : 'Commercial')
    : provider.serviceType === 'residential'
    ? (es ? 'Residencial' : 'Residential')
    : (es ? 'Ambos' : 'Both');
  const location = provider.city
    ? `${provider.city}${provider.state ? ', ' + provider.state : ''}`
    : provider.state || null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{
        width: 48, height: 48,
        backgroundColor: `${C.accent}20`,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
      }}>
        <Text style={{ color: C.accent, fontSize: 18, fontFamily: 'Inter_700Bold' }}>
          {provider.name[0]?.toUpperCase() ?? 'P'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_600SemiBold', marginBottom: 2 }}>
          {provider.name}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 2 }}>
          {roleLabel} · {serviceLabel}
        </Text>
        {location && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Feather name="map-pin" size={10} color={C.textMuted} style={{ marginRight: 3 }} />
            <Text style={{ color: C.textMuted, fontSize: 11, fontFamily: 'Inter_400Regular' }}>{location}</Text>
          </View>
        )}
        <StarRating rating={provider.avgRating} count={provider.reviewCount} es={es} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{
          backgroundColor: `${C.success}15`,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}>
          <Text style={{ color: C.success, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
            {es ? 'DISPONIBLE' : 'AVAILABLE'}
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={C.textMuted} />
      </View>
    </TouchableOpacity>
  );
});

export default function BrowseProviders() {
  const { t, lang } = useLang();
  const es = lang === 'es';
  const { user } = useAuthStore();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);

  const fetchPage = useCallback(async (startOffset: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      let q = supabase
        .from('users')
        .select('id, email, role, country, available, companies(company_name, service_type, city, state), independents(full_name, service_type, city, state)')
        .eq('status', 'approved')
        .eq('available', true)
        .in('role', ['company', 'independent'])
        .range(startOffset, startOffset + PAGE_SIZE - 1);

      if (user?.country) q = q.eq('country', user.country);

      const { data } = await q;
      if (!data) return;

      const mapped: Provider[] = data.map((u: any) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        country: u.country,
        available: u.available ?? false,
        name: u.role === 'company'
          ? (u.companies?.[0]?.company_name ?? u.email.split('@')[0])
          : (u.independents?.[0]?.full_name ?? u.email.split('@')[0]),
        serviceType: u.role === 'company'
          ? (u.companies?.[0]?.service_type ?? 'both')
          : (u.independents?.[0]?.service_type ?? 'both'),
        city: u.role === 'company'
          ? (u.companies?.[0]?.city ?? '')
          : (u.independents?.[0]?.city ?? ''),
        state: u.role === 'company'
          ? (u.companies?.[0]?.state ?? '')
          : (u.independents?.[0]?.state ?? ''),
        avgRating: null,
        reviewCount: 0,
      }));

      // Fetch reviews for this page's providers
      if (mapped.length > 0) {
        const ids = mapped.map((p) => p.id);
        const { data: reviews } = await supabase
          .from('reviews')
          .select('provider_id, rating')
          .in('provider_id', ids);

        if (reviews) {
          const ratingMap: Record<string, { sum: number; count: number }> = {};
          reviews.forEach((r: { provider_id: string; rating: number }) => {
            if (!ratingMap[r.provider_id]) ratingMap[r.provider_id] = { sum: 0, count: 0 };
            ratingMap[r.provider_id].sum += r.rating;
            ratingMap[r.provider_id].count += 1;
          });
          mapped.forEach((p) => {
            const entry = ratingMap[p.id];
            if (entry && entry.count > 0) {
              p.avgRating = entry.sum / entry.count;
              p.reviewCount = entry.count;
            }
          });
        }
      }

      setHasMore(data.length === PAGE_SIZE);
      offsetRef.current = startOffset + data.length;

      if (append) {
        setProviders((prev) => [...prev, ...mapped]);
      } else {
        setProviders(mapped);
      }
    } catch {
      // silently fail — show empty state
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [user?.country]);

  const loadProviders = useCallback(async () => {
    offsetRef.current = 0;
    await fetchPage(0, false);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    await fetchPage(offsetRef.current, true);
  }, [fetchPage, loadingMore, hasMore]);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const filtered = query.length > 0
    ? providers.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.serviceType.toLowerCase().includes(query.toLowerCase()) ||
        p.city.toLowerCase().includes(query.toLowerCase()) ||
        p.state.toLowerCase().includes(query.toLowerCase())
      )
    : providers;

  const renderItem = useCallback(({ item }: { item: Provider }) => (
    <ProviderCard
      provider={item}
      es={es}
      onPress={() => router.push({ pathname: '/(client)/provider-detail', params: { id: item.id } } as any)}
    />
  ), [es, router]);

  return (
    <ScreenWrapper>
      <View style={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 8 }}>
        <Text style={{ color: C.textPrimary, fontSize: 28, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 }}>
          {t('client.findProviders')}
        </Text>
        <Text style={{ color: C.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular', marginTop: 4 }}>
          {t('client.verifiedNearYou')}
        </Text>
      </View>

      <View style={{
        marginHorizontal: 24,
        marginTop: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderWidth: 1.5,
        borderColor: query.length > 0 ? C.accent : C.line,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
      }}>
        <Feather name="search" size={16} color={C.textMuted} style={{ marginRight: 10 }} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('client.searchPlaceholder')}
          placeholderTextColor={C.textMuted}
          style={{ flex: 1, color: C.textPrimary, fontSize: 15, fontFamily: 'Inter_400Regular' }}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Feather name="x" size={16} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <SkeletonList count={5} />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={query.length > 0 ? t('common.noResults') : t('client.noProvidersYet')}
          subtitle={query.length > 0
            ? `${t('client.noProvidersMatch')} "${query}"`
            : t('client.browseSubtitle')}
          iconName="users"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            query.length === 0 && hasMore ? (
              <TouchableOpacity
                onPress={loadMore}
                disabled={loadingMore}
                style={{
                  marginTop: 4,
                  marginBottom: 8,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: C.line,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: C.surface,
                  flexDirection: 'row',
                }}
                activeOpacity={0.75}
              >
                {loadingMore ? (
                  <ActivityIndicator color={C.accent} size="small" />
                ) : (
                  <>
                    <Feather name="chevron-down" size={14} color={C.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={{ color: C.textSecondary, fontSize: 14, fontFamily: 'Inter_500Medium' }}>
                      {es ? 'Cargar más' : 'Load more'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </ScreenWrapper>
  );
}
