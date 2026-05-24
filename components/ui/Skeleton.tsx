import { View } from 'react-native';
import { C } from '@/constants/theme';

/** A single grey rectangle — the building block for all skeleton screens. */
function SkeletonBox({
  width = '100%',
  height = 14,
  radius = 6,
  mb = 0,
}: {
  width?: number | string;
  height?: number;
  radius?: number;
  mb?: number;
}) {
  return (
    <View
      style={{
        width: width as any,
        height,
        borderRadius: radius,
        backgroundColor: C.surface2,
        marginBottom: mb,
      }}
    />
  );
}

/** Generic card-shaped skeleton (title + a few lines). */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: C.line,
      }}
    >
      <SkeletonBox width="55%" height={16} radius={8} mb={10} />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          width={i === lines - 1 ? '35%' : '75%'}
          height={11}
          radius={6}
          mb={8}
        />
      ))}
    </View>
  );
}

/** Renders `count` stacked SkeletonCards. */
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}

/** Square stat-card shaped skeleton for dashboard headers. */
export function SkeletonStatCard() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: C.line,
        alignItems: 'center',
      }}
    >
      <SkeletonBox width={36} height={36} radius={10} mb={8} />
      <SkeletonBox width={40} height={22} radius={6} mb={6} />
      <SkeletonBox width={60} height={10} radius={4} />
    </View>
  );
}

/** Compact row-style card skeleton (for MiniJobCard / notification rows). */
export function SkeletonRow() {
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.line,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <SkeletonBox width="50%" height={14} radius={6} mb={8} />
        <SkeletonBox width="70%" height={11} radius={6} />
      </View>
      <SkeletonBox width={56} height={24} radius={8} />
    </View>
  );
}
