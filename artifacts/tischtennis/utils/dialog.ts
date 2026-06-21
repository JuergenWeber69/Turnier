import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * React Native's Alert.alert with buttons does NOT work on react-native-web,
 * so on web we fall back to window.confirm.
 */
export function confirmDialog(opts: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}): void {
  const {
    title,
    message = '',
    confirmText = 'OK',
    cancelText = 'Abbrechen',
    destructive = false,
    onConfirm,
    onCancel,
  } = opts;

  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    const ok = typeof window !== 'undefined' ? window.confirm(text) : false;
    if (ok) onConfirm();
    else onCancel?.();
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** Cross-platform notification (single OK button). */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined') window.alert(text);
    return;
  }
  Alert.alert(title, message);
}
