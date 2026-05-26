import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import ScreenWrapper from '@/components/layout/ScreenWrapper';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Feather } from '@expo/vector-icons';
import { C } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/context/LanguageContext';
import { useAuthStore } from '@/store/authStore';
import { saveUserLocation } from '@/lib/userUtils';
import * as Location from 'expo-location';

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
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

const ProviderCard = React.memo(function ProviderCard({ provider, es, onPress }: {
  provider: Provider; es: boolean; onPress: () => void;
}) {
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
        {provider.distanceKm != null && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Feather name="navigation" size={10} color={C.accent} style={{ marginRight: 3 }} />
            <Text style={{ color: C.accent, fontSize: 11, fontFamily: 'Inter_500Medium' }}>
              ~{provider.distanceKm < 1 ? '<1' : Math.round(provider.distanceKm)} km
            </Text>
          </View>
        )}
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

  // ── Geolocation ─────────────────────────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null); // null = no filter

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return; // skip on web
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });

        // Save to profile table for future matching (no users table required)
        if (user?.id) {
          await saveUserLocation(user.id, loc.coords.latitude, loc.coords.longitude);
        }
      } catch {
        // Location unavailable — continue without it
      }
    })();
  }, [user?.id]);

  const fetchPage = useCallback(async (startOffset: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      // Query companies and independents directly (no users table needed)
      const countryFilter = user?.country;
      const [companiesRes, independentsRes] = await Promise.all([
        (() => {
          let q = supabase.from('companies')
            .select('user_id, company_name, service_type, city, state, country, available, latitude, longitude, status')
            .eq('status', 'approved').eq('available', true)
            .range(startOffset, startOffset + PAGE_SIZE - 1);
          if (countryFilter) q = q.eq('country', countryFilter);
          return q;
        })(),
        (() => {
          let q = supabase.from('independents')
            .select('user_id, full_name, service_type, city, state, country, available, latitude, longitude, status')
            .eq('status', 'approved').eq('available', true)
            .range(startOffset, startOffset + PAGE_SIZE - 1);
          if (countryFilter) q = q.eq('country', countryFilter);
          return q;
        })(),
      ]);

      const mapped: Provider[] = [
        ...(companiesRes.data ?? []).map((c: any) => {
          const lat = c.latitude as number | null;
          const lon = c.longitude as number | null;
          return {
            id: c.user_id, email: '', role: 'company' as const, country: c.country ?? 'usa', available: c.available ?? false,
            name: c.company_name, serviceType: c.service_type ?? 'both', city: c.city ?? '', state: c.state ?? '',
            latitude: lat, longitude: lon,
            distanceKm: (userLocation && lat != null && lon != null) ? haversineKm(userLocation.lat, userLocation.lon, lat, lon) : null,
            avgRating: null, reviewCount: 0,
          };
        }),
        ...(independentsRes.data ?? []).map((i: any) => {
          const lat = i.latitude as number | null;
          const lon = i.longitude as number | null;
          return {
            id: i.user_id, email: '', role: 'independent' as const, country: i.country ?? 'usa', available: i.available ?? false,
            name: i.full_name, serviceType: i.service_type ?? 'both', city: i.city ?? '', state: i.state ?? '',
            latitude: lat, longitude: lon,
            distanceKm: (userLocation && lat != null && lon != null) ? haversineKm(userLocation.lat, userLocation.lon, lat, lon) : null,
            avgRating: null, reviewCount: 0,
          };
        }),
      ];

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

      const totalFetched = (companiesRes.data?.length ?? 0) + (independentsRes.data?.length ?? 0);
      setHasMore(totalFetched >= PAGE_SIZE);
      offsetRef.current = startOffset + PAGE_SIZE;

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
    if (loadingMore || !hasMore || loading) return;
    await fetchPage(offsetRef.current, true);
  }, [fetchPage, loadingMore, hasMore, loading]);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  // Apply radius filter + text search, then sort by distance
  const filtered = (() => {
    let list = providers;

    if (query.length > 0) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.serviceType.toLowerCase().includes(query.toLowerCase()) ||
        p.city.toLowerCase().includes(query.toLowerCase()) ||
        p.state.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (radiusKm != null) {
      list = list.filter((p) => p.distanceKm != null && p.distanceKm <= radiusKm);
    }

    // Sort by distance ascending if location is available
    if (userLocation) {
      list = [...list].sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return list;
  })();

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

      {/* Distance radius filter (only when location is available) */}
      {userLocation && (
        <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="navigation" size={13} color={C.accent} />
            <Text style={{ color: C.textSecondary, fontSize: 12, fontFamily: 'Inter_500Medium', flex: 1 }}>
              {es ? 'Radio de búsqueda:' : 'Search radius:'}
            </Text>
            {[null, 5, 10, 25].map((km) => (
              <TouchableOpacity
                key={km ?? 'all'}
                onPress={() => setRadiusKm(km)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: radiusKm === km ? C.accent : C.surface,
                  borderWidth: 1,
                  borderColor: radiusKm === km ? C.accent : C.line,
                }}
              >
                <Text style={{
                  color: radiusKm === km ? '#FFF' : C.textSecondary,
                  fontSize: 11,
                  fontFamily: 'Inter_500Medium',
                }}>
                  {km == null ? (es ? 'Todos' : 'All') : `${km}km`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

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
