import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';

interface Props {
  children: React.ReactNode;
  scroll?: boolean;
  className?: string;
}

export default function ScreenWrapper({ children, scroll = false, className = '' }: Props) {
  const content = (
    <View className={`flex-1 bg-background ${className}`}>
      {children}
    </View>
  );
  return (
    <SafeAreaView className="flex-1 bg-background">
      {scroll
        ? <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>{content}</ScrollView>
        : content}
    </SafeAreaView>
  );
}
