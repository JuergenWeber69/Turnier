import { AppIcon as Ionicons } from '@/components/AppIcon';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
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

interface ParsedPlayer {
  name: string;
  ttr: number;
  valid: boolean;
  error?: string;
}

function parseCSVText(raw: string): ParsedPlayer[] {
  const lines = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  return lines.map(line => {
    // Support: semicolon, comma, tab
    const parts = line.split(/[;,\t]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) {
      return { name: line, ttr: 0, valid: false, error: 'Trennzeichen fehlt (;  ,  Tab)' };
    }
    const name = parts[0];
    const ttrRaw = parts[1].replace(/\D/g, ''); // strip non-digits
    const ttr = parseInt(ttrRaw, 10);
    if (!name) return { name: '', ttr: 0, valid: false, error: 'Name fehlt' };
    if (isNaN(ttr) || ttr <= 0) return { name, ttr: 0, valid: false, error: 'TTR ungültig' };
    return { name, ttr, valid: true };
  });
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onImport: (players: { name: string; ttr: number }[]) => void;
}

export function CsvImportModal({ visible, onClose, onImport }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [csvText, setCsvText] = useState('');

  const parsed = csvText.trim().length > 0 ? parseCSVText(csvText) : [];
  const valid = parsed.filter(p => p.valid);
  const hasErrors = parsed.some(p => !p.valid);
  const canImport = valid.length >= 1;

  const styles = makeStyles(colors);

  const handleImport = () => {
    if (!canImport) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onImport(valid.map(p => ({ name: p.name, ttr: p.ttr })));
    setCsvText('');
    onClose();
  };

  const handleClose = () => {
    setCsvText('');
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Ionicons name="document-text" size={22} color={colors.primary} />
            <Text style={[styles.title, { color: colors.foreground }]}>CSV-Import</Text>
          </View>

          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Kopiere Spielerdaten aus Excel/Tabelle und füge sie hier ein.{'\n'}
            Format pro Zeile: <Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.foreground }}>Name ; TTR</Text>
            {'\n'}Trennzeichen: Semikolon, Komma oder Tab
          </Text>

          <TextInput
            style={[styles.textarea, {
              color: colors.foreground,
              backgroundColor: colors.secondary,
              borderColor: colors.border,
            }]}
            multiline
            numberOfLines={8}
            placeholder={'Max Mustermann;1540\nAnna Beispiel;1320\nTom Tester;1180'}
            placeholderTextColor={colors.mutedForeground}
            value={csvText}
            onChangeText={setCsvText}
            autoCorrect={false}
            autoCapitalize="words"
            textAlignVertical="top"
          />

          {/* Preview */}
          {parsed.length > 0 && (
            <ScrollView style={styles.preview} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              <Text style={[styles.previewTitle, { color: colors.mutedForeground }]}>
                VORSCHAU — {valid.length} gültig{hasErrors ? `, ${parsed.length - valid.length} Fehler` : ''}
              </Text>
              {parsed.map((p, i) => (
                <View key={i} style={[styles.previewRow, { borderColor: colors.border }]}>
                  <Ionicons
                    name={p.valid ? 'checkmark-circle' : 'close-circle'}
                    size={16}
                    color={p.valid ? colors.success : colors.destructive}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.previewName, { color: p.valid ? colors.foreground : colors.destructive }]}>
                      {p.name || '(kein Name)'}
                    </Text>
                    {!p.valid && (
                      <Text style={[styles.previewError, { color: colors.destructive }]}>{p.error}</Text>
                    )}
                  </View>
                  {p.valid && (
                    <Text style={[styles.previewTTR, { color: colors.primary }]}>{p.ttr}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.importBtn, { backgroundColor: canImport ? colors.primary : colors.muted }]}
            onPress={handleImport}
            disabled={!canImport}
            activeOpacity={0.8}>
            <Ionicons name="download" size={18} color={canImport ? '#fff' : colors.mutedForeground} />
            <Text style={[styles.importBtnText, { color: canImport ? '#fff' : colors.mutedForeground }]}>
              {canImport ? `${valid.length} Spieler importieren` : 'Daten einfügen'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Abbrechen</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 20,
      maxHeight: '90%',
    },
    handle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 18,
    },
    titleRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10,
    },
    title: {
      fontSize: 18, fontFamily: 'Inter_700Bold',
    },
    hint: {
      fontSize: 13, fontFamily: 'Inter_400Regular',
      lineHeight: 20, marginBottom: 14,
    },
    textarea: {
      borderWidth: 1, borderRadius: 12,
      padding: 12, fontSize: 14,
      fontFamily: 'Inter_400Regular',
      minHeight: 120,
      marginBottom: 14,
    },
    preview: {
      maxHeight: 180,
      marginBottom: 14,
    },
    previewTitle: {
      fontSize: 10, fontFamily: 'Inter_600SemiBold',
      letterSpacing: 0.8, textTransform: 'uppercase',
      marginBottom: 8,
    },
    previewRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 6, borderBottomWidth: 1,
    },
    previewName: {
      fontSize: 14, fontFamily: 'Inter_500Medium',
    },
    previewError: {
      fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1,
    },
    previewTTR: {
      fontSize: 14, fontFamily: 'Inter_700Bold',
    },
    importBtn: {
      width: '100%', alignSelf: 'stretch',
      minHeight: 54, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8, marginBottom: 2,
      borderWidth: 1, borderColor: 'transparent', overflow: 'hidden',
      shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
    },
    importBtnText: {
      fontSize: 16, fontFamily: 'Inter_600SemiBold',
    },
    cancelBtn: {
      paddingVertical: 13, alignItems: 'center',
    },
    cancelText: {
      fontSize: 15, fontFamily: 'Inter_500Medium',
    },
  });
}
