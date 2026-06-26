import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { AppDialogOptions, setAppDialogHandler } from '@/utils/dialog';

export function AppDialogHost() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(colors);
  const [dialog, setDialog] = useState<AppDialogOptions | null>(null);

  useEffect(() => {
    setAppDialogHandler(setDialog);
    return () => setAppDialogHandler(null);
  }, []);

  if (!dialog) return null;

  const dismiss = () => setDialog(null);
  const cancelText = dialog.cancelText ?? 'Abbrechen';
  const confirmText = dialog.confirmText ?? 'OK';
  const confirmColor = dialog.destructive ? colors.destructive : colors.primary;
  const showCancel = Boolean(dialog.onCancel || dialog.cancelText);

  const handleCancel = () => {
    dismiss();
    dialog.onCancel?.();
  };

  const handleConfirm = () => {
    dismiss();
    dialog.onConfirm();
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={handleCancel}>
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable
          style={[styles.card, { paddingBottom: insets.bottom + 20 }]}
          onPress={(event) => event.stopPropagation()}>
          <Text style={[styles.title, { color: colors.foreground }]}>{dialog.title}</Text>
          {dialog.message ? (
            <Text style={[styles.message, { color: colors.mutedForeground }]}>{dialog.message}</Text>
          ) : null}

          <View style={styles.actions}>
            {showCancel ? (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleCancel}
                activeOpacity={0.75}>
                <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>{cancelText}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: confirmColor }]}
              onPress={handleConfirm}
              activeOpacity={0.85}>
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(15,23,42,0.42)',
    },
    card: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 18,
      paddingTop: 22,
      paddingHorizontal: 18,
      backgroundColor: colors.card,
      shadowColor: '#0f172a',
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    title: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      lineHeight: 21,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
      marginBottom: 18,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    button: {
      flex: 1,
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderWidth: 1,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
    },
    primaryButton: {
      borderColor: 'transparent',
    },
    secondaryText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      textAlign: 'center',
    },
    primaryText: {
      fontSize: 15,
      fontFamily: 'Inter_700Bold',
      textAlign: 'center',
    },
  });
}
