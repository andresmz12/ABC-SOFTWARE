import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { savePushToken as saveTokenToProfile } from './userUtils';

// ── setNotificationHandler: wrap in try/catch — throws in Expo Go ─────────────
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  // Not available in Expo Go or web — silently skip
}

// ─── Register for push notifications ─────────────────────────────────────────

export const registerForPushNotifications = async (): Promise<string | null> => {
  // Push notifications require a real device AND a standalone/production build.
  // In Expo Go (SDK 53+) and in __DEV__ mode they are not supported.
  if (!Device.isDevice) return null;
  if (__DEV__) return null;                                    // skip in Metro dev builds
  if (Constants.appOwnership === 'expo') return null;          // skip in Expo Go

  try {
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

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  } catch (e) {
    // Silently fail — never block the user flow due to notification errors
    console.warn('[notifications] registerForPushNotifications failed:', e);
    return null;
  }
};

// ─── Save push token to DB ────────────────────────────────────────────────────

export const savePushToken = async (userId: string, token: string): Promise<void> => {
  // Write to profile tables (clients / companies / independents)
  await saveTokenToProfile(userId, token);
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
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
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
    if (!res.ok) console.warn('[notifications] Expo push API error:', res.status);
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

// ─── Work Order notification helpers ─────────────────────────────────────────

export const notifyWOSignatureRequired = (token: string, woNumber: string, es: boolean) =>
  sendPushNotification(
    token,
    es ? '✍️ Firma Requerida' : '✍️ Signature Required',
    es
      ? `Se requiere tu firma para la Orden de Trabajo ${woNumber}.`
      : `Your signature is required for Work Order ${woNumber}.`,
    { type: 'wo_signature_required' },
  );

export const notifyWOClientSigned = (token: string, woNumber: string, es: boolean) =>
  sendPushNotification(
    token,
    es ? '✍️ El Cliente Firmó' : '✍️ Client Signed',
    es
      ? `El cliente ya firmó la Orden ${woNumber}. Ahora es tu turno.`
      : `The client signed Work Order ${woNumber}. Now it's your turn.`,
    { type: 'wo_client_signed' },
  );

export const notifyWOBothSigned = (token: string, woNumber: string, es: boolean) =>
  sendPushNotification(
    token,
    es ? '✅ Trabajo Confirmado' : '✅ Job Confirmed',
    es
      ? `Ambas partes firmaron la Orden ${woNumber}. ¡El trabajo puede comenzar!`
      : `Both parties signed Work Order ${woNumber}. The job can begin!`,
    { type: 'wo_both_signed' },
  );
