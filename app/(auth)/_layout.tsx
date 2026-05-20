import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register/client" />
      <Stack.Screen name="register/company/step1" />
      <Stack.Screen name="register/company/step2" />
      <Stack.Screen name="register/company/step3" />
      <Stack.Screen name="register/company/step4" />
      <Stack.Screen name="register/independent/step1" />
      <Stack.Screen name="register/independent/step2" />
      <Stack.Screen name="register/independent/step3" />
      <Stack.Screen name="register/independent/step4" />
    </Stack>
  );
}
