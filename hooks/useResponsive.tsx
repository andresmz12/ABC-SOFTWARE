import React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { C } from '@/constants/theme';

/** Width (px) from which the web build switches from the phone layout to the desktop layout. */
export const DESKTOP_BREAKPOINT = 900;

/** True only on the web build with a wide window. Native apps always get the phone layout. */
export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
}

/**
 * Centers screen content and caps its width on desktop; a plain pass-through on phones.
 * Used both as a Tabs `screenLayout` and as a wrapper for stack layouts.
 */
export function ContentFrame({
  children,
  maxWidth = 1080,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: C.background }}>
      <View style={{ flex: 1, width: '100%', maxWidth }}>{children}</View>
    </View>
  );
}

/**
 * Tabs options that turn the bottom tab bar into a left sidebar on desktop.
 * Spread the result into `screenOptions` and pass `screenLayout={tabsScreenLayout}`.
 */
export function useTabsResponsive(bottomBarStyle: object): BottomTabNavigationOptions {
  const isDesktop = useIsDesktop();
  if (!isDesktop) {
    return {
      tabBarPosition: 'bottom' as const,
      tabBarStyle: bottomBarStyle,
      tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
    };
  }
  return {
    tabBarPosition: 'left' as const,
    tabBarVariant: 'uikit' as const,
    tabBarLabelPosition: 'beside-icon' as const,
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderRightColor: C.line,
      borderRightWidth: 1,
      width: 230,
      minWidth: 230,
      maxWidth: 230,
      flexGrow: 0,
      flexShrink: 0,
      paddingTop: 16,
      paddingHorizontal: 8,
    },
    tabBarLabelStyle: { fontSize: 14, fontFamily: 'Inter_500Medium', marginLeft: 8 },
    tabBarActiveBackgroundColor: '#E6F4FA',
    tabBarItemStyle: { justifyContent: 'flex-start' as const, paddingHorizontal: 12, borderRadius: 10, marginBottom: 2 },
  };
}

export const tabsScreenLayout = ({ children }: { children: React.ReactElement }) => (
  <ContentFrame>{children}</ContentFrame>
);
