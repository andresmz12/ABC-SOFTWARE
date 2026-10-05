import { Stack } from 'expo-router';
import { ContentFrame } from '@/hooks/useResponsive';

// Login / registration stay a narrow, centered column even on wide screens.
export default function AuthLayout() {
  return (
    <ContentFrame maxWidth={480}>
      <Stack screenOptions={{ headerShown: false }} />
    </ContentFrame>
  );
}
