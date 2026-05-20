import { View } from 'react-native';
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

function SkeletonBox({ className }: { className: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ opacity }} className={`bg-gray-200 rounded-lg ${className}`} />;
}

export default function LoadingSkeleton() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
      <SkeletonBox className="h-4 w-3/4 mb-3" />
      <SkeletonBox className="h-3 w-1/2 mb-2" />
      <SkeletonBox className="h-3 w-2/3" />
    </View>
  );
}
