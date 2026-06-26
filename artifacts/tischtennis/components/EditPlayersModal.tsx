import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Player } from '@/types';

interface Draft {
  id: string;
  name: string;
  ttr: string;
}

interface Props {
  visible: boolean;
  players: Player[];
  onClose: () => void;
  onSave: (playerId: string, name: string, ttr: number) => void;
}

export function EditPlayersModal({ visible, players, onClose, onSave }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    if (visible) {
      setDrafts(players.map(p => ({ id: p.id, name: p.name, ttr: String(p.ttr) })));
    }
  }, [visible, players]);

  const styles = makeStyles(colors);

  const setField = (i: number, field: 'name' | 'ttr', val: string) => {
    setDrafts(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  };

  const isValid = (d: Draft) => {
    const ttr = parseInt(d.ttr, 10);
    return d.name.trim().length > 0 && !isNaN(ttr) && ttr > 0;
  };

  const allValid = drafts.every(isValid);

  const handleSave = () => {
    if (!allValid) return;
    drafts.forEach(d => {
      const orig = players.find(p => p.id === d.id);
      const ttr = parseInt(d.ttr, 10);
      if (orig && (orig.name !== d.name.trim() || orig.ttr !== ttr)) {
        onSave(d.id, d.name, ttr);
      }
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />

            <View style={styles.titleRow}>
              <Ionicons name="create" size={22} color={colors.primary} />
              <Text style={[styles.title, { color: colors.foreground }]}>Spieler bearbeiten</Text>
            </View>

            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Namen und TTR-Werte können hier korrigiert werden.
            </Text>

            <ScrollView
              style={styles.list}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {drafts.map((d, i) => {
                const valid = isValid(d);
                return (
                  <View key={d.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <View style={[styles.numBadge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.numText, { color: colors.mutedForeground }]}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={[styles.nameInput, { color: colors.foreground, borderRightColor: colors.border }]}
                      value={d.name}
                      onChangeText={val => setField(i, 'name', val)}
                      placeholder="Name"
                      placeholderTextColor={colors.mutedForeground}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                    <TextInput
                      style={[
                        styles.ttrInput,
                        { color: valid ? colors.primary : colors.destructive },
                      ]}
                      value={d.ttr}
                      onChangeText={val => setField(i, 'ttr', val.replace(/\D/g, ''))}
                      placeholder="TTR"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      maxLength={4}
                      returnKeyType="done"
                    />
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: allValid ? colors.primary : colors.muted }]}
              onPress={handleSave}
              disabled={!allValid}
              activeOpacity={0.8}>
              <Ionicons name="checkmark" size={18} color={allValid ? '#fff' : colors.mutedForeground} />
              <Text style={[styles.saveBtnText, { color: allValid ? '#fff' : colors.mutedForeground }]}>
                Speichern
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Abbrechen</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1, justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingTop: 12, paddingHorizontal: 20,
      maxHeight: '90%',
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center', marginBottom: 18,
    },
    titleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
    },
    title: {
      fontSize: 18, fontFamily: 'Inter_700Bold',
    },
    hint: {
      fontSize: 13, fontFamily: 'Inter_400Regular',
      lineHeight: 20, marginBottom: 14,
    },
    list: { maxHeight: 340, marginBottom: 14 },
    row: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 12, marginBottom: 8, overflow: 'hidden',
    },
    numBadge: {
      width: 36, height: 48, alignItems: 'center', justifyContent: 'center',
    },
    numText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    nameInput: {
      flex: 1, height: 48, paddingHorizontal: 10,
      fontSize: 14, fontFamily: 'Inter_400Regular',
      borderRightWidth: 1,
    },
    ttrInput: {
      width: 70, height: 48, paddingHorizontal: 10,
      fontSize: 14, fontFamily: 'Inter_700Bold', textAlign: 'center',
    },
    saveBtn: {
      borderRadius: 14, paddingVertical: 15,
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, marginBottom: 2,
    },
    saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
    cancelBtn: { paddingVertical: 13, alignItems: 'center' },
    cancelText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  });
}
