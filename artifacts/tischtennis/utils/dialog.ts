import { Alert, Platform } from 'react-native';

/**
 * Imperative cross-platform confirmation / notification dialogs.
 *
 * On native we use React Native's `Alert.alert`, which renders the custom
 * button labels we pass in.
 *
 * On web the browser's `window.confirm`/`window.alert` ALWAYS render the
 * native "OK"/"Cancel" buttons and ignore any custom labels, so the
 * "Ja"/"Nein" texts requested by the app never showed up. Instead we drive a
 * lightweight in-app modal (`DialogHost`, mounted in the root layout) through a
 * tiny module-level store, which honours the configured button labels.
 */

export interface DialogRequest {
  id: number;
  title: string;
  message: string;
  confirmText: string;
  /** Undefined for `notify` (single-button information dialog). */
  cancelText?: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

let current: DialogRequest | null = null;
let counter = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

/** Subscribe the host component to dialog changes. */
export function subscribeDialog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current dialog to render, or null. Stable reference between changes. */
export function getDialog(): DialogRequest | null {
  return current;
}

/** Resolve the active dialog and fire the matching callback. */
export function resolveDialog(confirmed: boolean): void {
  const req = current;
  current = null;
  emit();
  if (!req) return;
  if (confirmed) req.onConfirm();
  else req.onCancel?.();
}

function show(req: Omit<DialogRequest, 'id'>): void {
  current = { ...req, id: ++counter };
  emit();
}

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

  if (Platform.OS !== 'web') {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: onCancel },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);
    return;
  }

  show({ title, message, confirmText, cancelText, destructive, onConfirm, onCancel });
}

/** Cross-platform notification (single OK button). */
export function notify(title: string, message?: string): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message);
    return;
  }
  show({ title, message: message ?? '', confirmText: 'OK', destructive: false, onConfirm: () => {} });
}
