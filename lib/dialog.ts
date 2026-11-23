// Cross-platform alert/confirm. React Native's Alert.alert is a no-op on web.
import { Alert, Platform } from 'react-native';

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function confirmAction(
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, onPress: onConfirm },
  ]);
}

/**
 * react-native-web ships Alert.alert as an empty function, so every error and
 * confirmation in the app was silently lost on web. Install a real
 * implementation backed by window.alert / window.confirm.
 * Call once at app start (see app/_layout.tsx).
 */
export function installWebAlert(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  (Alert as any).alert = (
    title: string,
    message?: string,
    buttons?: { text?: string; style?: string; onPress?: () => void }[],
  ) => {
    const text = message ? `${title}\n\n${message}` : title;
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }
    const cancel = buttons.find((b) => b.style === 'cancel');
    const action = buttons.find((b) => b.style !== 'cancel') ?? buttons[0];
    if (window.confirm(text)) action.onPress?.();
    else cancel?.onPress?.();
  };
}
