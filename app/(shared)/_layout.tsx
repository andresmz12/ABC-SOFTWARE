import { Stack } from 'expo-router';
import { ContentFrame } from '@/hooks/useResponsive';

export default function SharedLayout() {
  return (
    <ContentFrame maxWidth={900}>
      <Stack screenOptions={{ headerShown: false }} />
    </ContentFrame>
  );
}
