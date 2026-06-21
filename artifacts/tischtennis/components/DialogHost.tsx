import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useColors } from '@/hooks/useColors';
import { getDialog, resolveDialog, subscribeDialog } from '@/utils/dialog';

/**
 * Renders confirmation / notification dialogs on web, where the browser's
 * native `window.confirm` ignores custom button labels. Mounted once in the
 * root layout; driven imperatively through the store in `@/utils/dialog`.
 */
export function DialogHost() {
  const req = React.useSyncExternalStore(subscribeDialog, getDialog, getDialog);
  const colors = useColors();
  const styles = makeStyles(colors);

  const isConfirm = req?.cancelText != null;

  return (
    <Modal
      transparent
      visible={!!req}
      animationType="fade"
      onRequestClose={() => resolveDialog(false)}>
      <Pressable style={styles.overlay} onPress={() => resolveDialog(false)}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>{req?.title}</Text>
          {!!req?.message && <Text style={styles.message}>{req.message}</Text>}

          <View style={styles.actions}>
            {isConfirm && (
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn]}
                onPress={() => resolveDialog(false)}
                activeOpacity={0.7}>
                <Text style={styles.cancelText}>{req?.cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                req?.destructive && styles.destructiveBtn,
              ]}
              onPress={() => resolveDialog(true)}
              activeOpacity={0.8}>
              <Text style={styles.confirmText}>{req?.confirmText}</Text>
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
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 24,
    },
    title: {
      fontSize: 17,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      lineHeight: 20,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      marginBottom: 8,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 16,
    },
    btn: {
      minWidth: 88,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelBtn: {
      backgroundColor: colors.secondary,
    },
    cancelText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    confirmBtn: {
      backgroundColor: colors.primary,
    },
    destructiveBtn: {
      backgroundColor: colors.destructive ?? colors.primary,
    },
    confirmText: {
      fontSize: 15,
      fontFamily: 'Inter_600SemiBold',
      color: colors.primaryForeground,
    },
  });
}
