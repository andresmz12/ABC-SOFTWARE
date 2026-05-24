import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Register for push notifications ─────────────────────────────────────────

export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // If user declines, continue silently without blocking the app
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00B4D8',
    });
  }

  // SDK 54 requires projectId from app config
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  } catch {
    return null;
  }
};

// ─── Save push token to DB ────────────────────────────────────────────────────

export const savePushToken = async (userId: string, token: string): Promise<void> => {
  await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', userId);
};

// ─── Register + save in one call (use after login / email confirmation) ───────

export const registerAndSavePushToken = async (userId: string): Promise<void> => {
  try {
    const token = await registerForPushNotifications();
    if (token) await savePushToken(userId, token);
  } catch {
    // Never block the user flow due to notification errors
  }
};

// ─── Send push notification via Expo Push API ────────────────────────────────
// Use this when you have the recipient's Expo push token on the client side.
// For server-side fan-out (new_job to many providers), use the edge function.

export const sendPushNotification = async (
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> => {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: data ?? {},
      }),
    });
  } catch (e) {
    console.warn('[notifications] sendPushNotification error:', e);
  }
};

// ─── Convenience helpers for common notification events ──────────────────────

export const notifyNewOffer = (token: string, providerName: string, city: string, es: boolean) =>
  sendPushNotification(
    token,
    es ? '💼 Nueva Oferta Recibida' : '💼 New Bid Received',
    es
      ? `${providerName} envió una oferta para tu trabajo en ${city}.`
      : `${providerName} submitted a bid for your job in ${city}.`,
    { type: 'new_offer' },
  );

export const notifyBidAccepted = (token: string, city: string, es: boolean) =>
  sendPushNotification(
    token,
    es ? '🎉 ¡Oferta Aceptada!' : '🎉 Bid Accepted!',
    es
      ? `¡Tu oferta fue aceptada para el trabajo en ${city}!`
      : `Your bid was accepted for the job in ${city}!`,
    { type: 'bid_accepted' },
  );

export const notifyBidRejected = (token: string, city: string, es: boolean) =>
  sendPushNotification(
    token,
    es ? 'ℹ️ Oferta No Seleccionada' : 'ℹ️ Bid Not Selected',
    es
      ? `El cliente seleccionó otro proveedor para el trabajo en ${city}.`
      : `The client selected another provider for the job in ${city}.`,
    { type: 'bid_rejected' },
  );

export const notifyJobCompleted = (token: string, city: string, es: boolean) =>
  sendPushNotification(
    token,
    es ? '✅ Trabajo Completado' : '✅ Job Completed',
    es
      ? `El trabajo en ${city} ha sido marcado como completado.`
      : `The job in ${city} has been marked as completed.`,
    { type: 'job_completed' },
  );

export const notifyChatMessage = (token: string, senderName: string, es: boolean) =>
  sendPushNotification(
    token,
    es ? '💬 Nuevo Mensaje' : '💬 New Message',
    es ? `${senderName} te envió un mensaje.` : `${senderName} sent you a message.`,
    { type: 'chat_message' },
  );
