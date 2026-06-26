import { Alert, Platform } from 'react-native';

export type AppDialogOptions = {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

let appDialogHandler: ((opts: AppDialogOptions) => void) | null = null;

export function setAppDialogHandler(handler: ((opts: AppDialogOptions) => void) | null): void {
  appDialogHandler = handler;
}

/**
 * Cross-platform confirmation dialog.
 * On web, the app-level dialog keeps custom button labels instead of
 * browser-default OK/Cancel text.
 */
export function confirmDialog(opts: AppDialogOptions): void {
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
    if (appDialogHandler) {
      appDialogHandler({ title, message, confirmText, cancelText, destructive, onConfirm, onCancel });
      return;
    }
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
    if (appDialogHandler) {
      appDialogHandler({
        title,
        message,
        confirmText: 'OK',
        onConfirm: () => {},
      });
      return;
    }
    const text = message ? `${title}\n\n${message}` : title;
    if (typeof window !== 'undefined') window.alert(text);
    return;
  }
  Alert.alert(title, message);
}
