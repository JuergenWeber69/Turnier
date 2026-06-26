import * as Haptics from 'expo-haptics';
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
import { Match, Tournament } from '@/types';
import { getPlayerName } from '@/utils/tournament';

interface ScoreModalProps {
  match: Match | null;
  tournament: Tournament;
  onClose: () => void;
  onSave: (matchId: string, score1: number, score2: number) => void;
}

const RESULTS_P1: [number, number][] = [[3, 0], [3, 1], [3, 2]];
const RESULTS_P2: [number, number][] = [[0, 3], [1, 3], [2, 3]];

export function ScoreModal({ match, tournament, onClose, onSave }: ScoreModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sel, setSel] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (match) {
      setSel(
        match.score1 !== null && match.score2 !== null
          ? [match.score1, match.score2]
          : null,
      );
    }
  }, [match?.id]);

  const styles = makeStyles(colors);

  if (!match) return null;

  const p1Name = getPlayerName(tournament, match.player1Id);
  const p2Name = getPlayerName(tournament, match.player2Id);

  const handleSave = () => {
    if (!sel) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(match.id, sel[0], sel[1]);
    onClose();
  };

  const PickBtn = ({ s1, s2 }: { s1: number; s2: number }) => {
    const isSelected = sel?.[0] === s1 && sel?.[1] === s2;
    return (
      <TouchableOpacity
        style={[styles.pickBtn, { backgroundColor: isSelected ? colors.primary : colors.secondary }]}
        onPress={() => { setSel([s1, s2]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        activeOpacity={0.8}>
        <Text style={[styles.pickBtnText, { color: isSelected ? colors.primaryForeground : colors.foreground }]}>
          {s1}:{s2}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal transparent animationType="slide" visible={!!match} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
          onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.foreground }]}>Ergebnis eintragen</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>3 Gewinnsätze</Text>

          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <Text style={[styles.colLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                {p1Name} gewinnt
              </Text>
              {RESULTS_P1.map(([s1, s2]) => <PickBtn key={`${s1}:${s2}`} s1={s1} s2={s2} />)}
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.gridCol}>
              <Text style={[styles.colLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                {p2Name} gewinnt
              </Text>
              {RESULTS_P2.map(([s1, s2]) => <PickBtn key={`${s1}:${s2}`} s1={s1} s2={s2} />)}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: sel ? 1 : 0.4 }]}
            onPress={handleSave}
            disabled={!sel}
            activeOpacity={0.8}>
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Speichern</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Abbrechen</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 18 },
    title: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 2 },
    subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 24 },
    grid: { flexDirection: 'row', gap: 0, width: '100%', marginBottom: 24, alignItems: 'flex-start' },
    gridCol: { flex: 1, gap: 8 },
    divider: { width: 1, marginHorizontal: 10, marginTop: 26, alignSelf: 'stretch' },
    colLabel: {
      fontSize: 11, fontFamily: 'Inter_600SemiBold',
      textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
    },
    pickBtn: {
      minHeight: 56, borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
      shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2,
    },
    pickBtnText: { fontSize: 22, fontFamily: 'Inter_700Bold' },
    saveBtn: {
      minHeight: 54, borderRadius: 12, paddingVertical: 15, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
      shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
    },
    saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
    cancelBtn: { paddingVertical: 14, width: '100%', alignItems: 'center' },
    cancelBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  });
}
