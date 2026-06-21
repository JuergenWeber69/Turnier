import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { usePlayerNames } from '@/hooks/usePlayerNames';
import { Player } from '@/types';
import { DoublePair, DoublesMatch, DoublesTournament } from '@/types/doubles';
import {
  DOUBLES_MIN_PLAYERS,
  calculateDoublesStandings,
  drawDoublesPairs,
  generateDoublesMatches,
  getMatchPlayerNames,
} from '@/utils/doubles';
import { confirmDialog, notify } from '@/utils/dialog';
import { exportDoublesPdf } from '@/utils/exportPdf';

const STORAGE_KEY = '@tischtennis_doubles_v1';
type Step = 'setup' | 'draw' | 'matches';
type ActiveTab = 'spiele' | 'tabelle';

interface PlayerDraft { name: string; ttr: string }
const EMPTY: PlayerDraft = { name: '', ttr: '' };

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ── Score Modal ───────────────────────────────────────────────────────────────
const MODAL_P1: [number, number][] = [[3, 0], [3, 1], [3, 2]];
const MODAL_P2: [number, number][] = [[0, 3], [1, 3], [2, 3]];

function DoublesScoreModal({
  match, tournament, onClose, onSave,
}: {
  match: DoublesMatch | null;
  tournament: DoublesTournament;
  onClose: () => void;
  onSave: (id: string, s1: number, s2: number) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sel, setSel] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (match) {
      setSel(match.score1 !== null && match.score2 !== null
        ? [match.score1, match.score2] : null);
    }
  }, [match?.id]);

  if (!match) return null;

  const pair1 = tournament.pairs.find(p => p.id === match.pair1Id)!;
  const pair2 = tournament.pairs.find(p => p.id === match.pair2Id)!;
  const n1 = getMatchPlayerNames(pair1, match.tripleActive1, tournament.players);
  const n2 = getMatchPlayerNames(pair2, match.tripleActive2, tournament.players);

  const handleSave = () => {
    if (!sel) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(match.id, sel[0], sel[1]);
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible={!!match} onRequestClose={onClose}>
      <Pressable style={mss.overlay} onPress={onClose}>
        <Pressable style={[mss.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
          <View style={[mss.handle, { backgroundColor: colors.border }]} />
          <Text style={[mss.modalTitle, { color: colors.foreground }]}>Ergebnis eintragen</Text>
          <Text style={[mss.modalSub, { color: colors.mutedForeground }]}>3 Gewinnsätze</Text>

          <View style={mss.grid}>
            <View style={mss.gridCol}>
              <Text style={[mss.colLabel, { color: colors.mutedForeground }]} numberOfLines={2}>
                {n1.line1} gewinnt
              </Text>
              {MODAL_P1.map(([s1, s2]) => {
                const isSelected = sel?.[0] === s1 && sel?.[1] === s2;
                return (
                  <TouchableOpacity
                    key={`${s1}:${s2}`}
                    style={[mss.pickBtn, { backgroundColor: isSelected ? colors.primary : colors.secondary }]}
                    onPress={() => { setSel([s1, s2]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    activeOpacity={0.8}>
                    <Text style={[mss.pickBtnText, { color: isSelected ? '#fff' : colors.foreground }]}>{s1}:{s2}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[mss.divider, { backgroundColor: colors.border }]} />
            <View style={mss.gridCol}>
              <Text style={[mss.colLabel, { color: colors.mutedForeground }]} numberOfLines={2}>
                {n2.line1} gewinnt
              </Text>
              {MODAL_P2.map(([s1, s2]) => {
                const isSelected = sel?.[0] === s1 && sel?.[1] === s2;
                return (
                  <TouchableOpacity
                    key={`${s1}:${s2}`}
                    style={[mss.pickBtn, { backgroundColor: isSelected ? colors.primary : colors.secondary }]}
                    onPress={() => { setSel([s1, s2]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    activeOpacity={0.8}>
                    <Text style={[mss.pickBtnText, { color: isSelected ? '#fff' : colors.foreground }]}>{s1}:{s2}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[mss.saveBtn, { backgroundColor: colors.primary, opacity: sel ? 1 : 0.4 }]}
            onPress={handleSave}
            disabled={!sel}
            activeOpacity={0.8}>
            <Text style={mss.saveBtnText}>Speichern</Text>
          </TouchableOpacity>

          <TouchableOpacity style={mss.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={[mss.cancelBtnText, { color: colors.mutedForeground }]}>Abbrechen</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const mss = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 20, alignItems: 'center' },
  handle: { width: 40, height: 4, borderRadius: 2, marginBottom: 18 },
  modalTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  modalSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginBottom: 22 },
  grid: { flexDirection: 'row', width: '100%', marginBottom: 24, alignItems: 'flex-start' },
  gridCol: { flex: 1, gap: 8 },
  divider: { width: 1, marginHorizontal: 10, marginTop: 24, alignSelf: 'stretch' },
  colLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  pickBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  pickBtnText: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  saveBtn: { borderRadius: 14, paddingVertical: 16, width: '100%', alignItems: 'center', marginBottom: 4 },
  saveBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  cancelBtn: { paddingVertical: 14, width: '100%', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DoublesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ players?: string }>();
  const styles = makeStyles(colors);

  // Persistent tournament state
  const [tournament, setTournament] = useState<DoublesTournament | null>(null);
  const [loading, setLoading] = useState(true);

  // Setup state
  const [tournamentName, setTournamentName] = useState('');
  const [drafts, setDrafts] = useState<PlayerDraft[]>(Array(7).fill(null).map(() => ({ ...EMPTY })));

  // Draw state — stored together so playerIds in pairs match drawnPlayers
  const [previewPairs, setPreviewPairs] = useState<DoublePair[]>([]);
  const [drawnPlayers, setDrawnPlayers] = useState<Player[]>([]);

  // UI state
  const [step, setStep] = useState<Step>('setup');
  const [activeTab, setActiveTab] = useState<ActiveTab>('spiele');
  const [selectedMatch, setSelectedMatch] = useState<DoublesMatch | null>(null);
  const [focusedNameIdx, setFocusedNameIdx] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const { saveNames, getSuggestions } = usePlayerNames();
  const endDialogShown = useRef(false);

  // Load persisted tournament
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(data => { if (data) { setTournament(JSON.parse(data)); setStep('matches'); } })
      .finally(() => setLoading(false));
  }, []);

  // Prefill the player list with the players entered on the main screen.
  // Carried over as a route param so the doubles draw uses the same roster
  // instead of forcing the user to re-type everyone.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !params.players) return;
    try {
      const incoming = JSON.parse(params.players) as { name?: string; ttr?: string }[];
      const cleaned = incoming
        .filter(p => p?.name?.trim())
        .map(p => ({ name: p.name!.trim(), ttr: p.ttr ?? '' }));
      if (cleaned.length > 0) {
        prefilled.current = true;
        setDrafts(cleaned);
      }
    } catch {
      // Malformed param — ignore and keep the empty draft rows.
    }
  }, [params.players]);

  // End-of-tournament save dialog
  useEffect(() => {
    if (!tournament) { endDialogShown.current = false; return; }
    const done = tournament.matches.length > 0 &&
      tournament.matches.every(m => m.completed) &&
      (tournament.currentRound ?? 0) >= (tournament.totalRounds ?? 0);
    if (done && !endDialogShown.current) {
      endDialogShown.current = true;
      confirmDialog({
        title: 'Turnier beendet 🏆',
        message: 'Möchten Sie das Ergebnis als PDF speichern?',
        confirmText: 'PDF speichern',
        cancelText: 'Nein, danke',
        onConfirm: async () => {
          setExporting(true);
          try { await exportDoublesPdf(tournament); }
          catch { notify('Fehler', 'Export fehlgeschlagen.'); }
          finally { setExporting(false); }
        },
      });
    }
    if (!done) endDialogShown.current = false;
  }, [tournament]);

  const persist = (t: DoublesTournament | null) => {
    if (t) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    else AsyncStorage.removeItem(STORAGE_KEY);
    setTournament(t);
  };

  const handleExportPdf = async () => {
    if (!tournament || exporting) return;
    setExporting(true);
    try {
      await exportDoublesPdf(tournament);
    } catch {
      notify('Fehler', 'PDF-Export fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setExporting(false);
    }
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const validDrafts = drafts.filter(d => d.name.trim().length > 0);
  const count = validDrafts.length;
  const allHaveTTR = validDrafts.every(d => d.ttr.trim().length > 0 && !isNaN(Number(d.ttr)));
  const setupValid = count >= DOUBLES_MIN_PLAYERS && allHaveTTR;

  const buildPlayers = (): Player[] =>
    validDrafts.map(d => ({
      id: genId(),
      name: d.name.trim(),
      ttr: Number(d.ttr),
    }));

  const pairCount = Math.ceil(count / 2);
  const hasTriple = count % 2 !== 0;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleGoToDraw = () => {
    const players = buildPlayers();
    const pairs = drawDoublesPairs(players);
    setDrawnPlayers(players);
    setPreviewPairs(pairs);
    setStep('draw');
  };

  const handleRedraw = () => {
    const players = buildPlayers();
    const pairs = drawDoublesPairs(players);
    setDrawnPlayers(players);
    setPreviewPairs(pairs);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleStartTournament = () => {
    saveNames(drawnPlayers.map(p => p.name));
    const matches = generateDoublesMatches(previewPairs);
    const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
    const t: DoublesTournament = {
      id: genId(),
      name: tournamentName.trim() || 'Doppelturnier',
      players: drawnPlayers,
      pairs: previewPairs,
      matches,
      currentRound: 1,
      totalRounds,
      createdAt: Date.now(),
    };
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    persist(t);
    setStep('matches');
  };

  const handleSaveScore = (matchId: string, s1: number, s2: number) => {
    if (!tournament) return;
    const updated: DoublesTournament = {
      ...tournament,
      matches: tournament.matches.map(m =>
        m.id === matchId ? { ...m, score1: s1, score2: s2, completed: true } : m,
      ),
    };
    persist(updated);
  };

  const handleAdvanceRound = () => {
    if (!tournament) return;
    persist({ ...tournament, currentRound: tournament.currentRound + 1 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleReset = () => {
    const finish = () => {
      persist(null);
      setStep('setup');
      setDrafts(Array(7).fill(null).map(() => ({ ...EMPTY })));
      setTournamentName('');
    };
    confirmDialog({
      title: 'Ergebnis als PDF exportieren?',
      message: 'Bei „Nein" gehen alle Daten des Turniers unwiderruflich verloren.',
      confirmText: 'Ja',
      cancelText: 'Nein',
      onConfirm: async () => {
        if (!tournament) { finish(); return; }
        setExporting(true);
        try {
          await exportDoublesPdf(tournament);
          finish();
        } catch {
          notify('Fehler', 'Export fehlgeschlagen. Das Turnier wurde nicht beendet.');
        } finally {
          setExporting(false);
        }
      },
      onCancel: finish,
    });
  };

  const addPlayer = () => {
    if (drafts.length >= 20) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrafts(prev => [...prev, { ...EMPTY }]);
  };

  const removePlayer = (i: number) => {
    if (drafts.length <= 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDrafts(prev => prev.filter((_, idx) => idx !== i));
  };

  if (loading) return <View style={[styles.root, { backgroundColor: colors.background }]} />;

  // ── STEP: SETUP ─────────────────────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.pad, { paddingTop: insets.top + 20 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Header */}
            <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={[styles.backText, { color: colors.primary }]}>Zurück</Text>
            </TouchableOpacity>

            <View style={styles.setupHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="people" size={30} color="#fff" />
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>Doppelturnier</Text>
              <Text style={[styles.sub, { color: colors.mutedForeground }]}>Jeder gegen Jeden · Doppel</Text>
            </View>

            {/* Tournament Name */}
            <View style={[styles.nameWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="ribbon-outline" size={18} color={colors.primary} style={{ marginLeft: 12 }} />
              <TextInput
                style={[styles.nameInput, { color: colors.foreground }]}
                placeholder="Turniername (optional)"
                placeholderTextColor={colors.mutedForeground}
                value={tournamentName}
                onChangeText={setTournamentName}
                returnKeyType="done"
                autoCapitalize="words"
                maxLength={60}
              />
            </View>

            {/* Info badge */}
            <View style={[styles.countBadge, { backgroundColor: setupValid ? colors.primary : colors.secondary }]}>
              <Text style={[styles.countText, { color: setupValid ? '#fff' : colors.mutedForeground }]}>
                {count < DOUBLES_MIN_PLAYERS
                  ? `${count} Spieler — mind. ${DOUBLES_MIN_PLAYERS} nötig`
                  : !allHaveTTR
                    ? `${count} Spieler — TTR für alle eintragen`
                    : `${count} Spieler → ${pairCount} Doppel${hasTriple ? ' (1 Dreier)' : ''}`}
              </Text>
            </View>

            {/* Column headers */}
            <View style={styles.colHeaderRow}>
              <Text style={[styles.colHeader, { color: colors.mutedForeground }]}>{'  #    Name                          TTR'}</Text>
              <Text style={[styles.colHint, { color: colors.mutedForeground }]}>Reihenfolge egal — wird automatisch sortiert</Text>
            </View>

            {/* Player rows */}
            {drafts.map((d, i) => {
              const skip = drafts.map(x => x.name.trim()).filter(Boolean);
              const suggestions = focusedNameIdx === i ? getSuggestions(d.name, skip) : [];
              return (
                <React.Fragment key={i}>
                  <View style={[styles.playerRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <View style={[styles.playerNum, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.playerNumText, { color: colors.mutedForeground }]}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={[styles.nameFieldInput, { color: colors.foreground, borderRightColor: colors.border }]}
                      placeholder="Name"
                      placeholderTextColor={colors.mutedForeground}
                      value={d.name}
                      onChangeText={val => setDrafts(prev => prev.map((p, idx) => idx === i ? { ...p, name: val } : p))}
                      onFocus={() => setFocusedNameIdx(i)}
                      onBlur={() => setTimeout(() => setFocusedNameIdx(null), 150)}
                      returnKeyType="next"
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={[styles.ttrInput, { color: colors.foreground }]}
                      placeholder="TTR"
                      placeholderTextColor={colors.mutedForeground}
                      value={d.ttr}
                      onChangeText={val => setDrafts(prev => prev.map((p, idx) => idx === i ? { ...p, ttr: val } : p))}
                      keyboardType="number-pad"
                      maxLength={4}
                      returnKeyType="done"
                    />
                    <TouchableOpacity onPress={() => removePlayer(i)} activeOpacity={0.7} style={styles.removeBtn}>
                      <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                  {suggestions.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="always"
                      style={styles.suggestRow}
                      contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}>
                      {suggestions.map(name => (
                        <TouchableOpacity
                          key={name}
                          style={[styles.suggestPill, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                          onPress={() => {
                            setDrafts(prev => prev.map((p, idx) => idx === i ? { ...p, name } : p));
                            setFocusedNameIdx(null);
                          }}>
                          <Text style={[styles.suggestPillText, { color: colors.foreground }]}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </React.Fragment>
              );
            })}

            <TouchableOpacity
              style={[styles.addBtn, { borderColor: colors.primary, backgroundColor: colors.primary }]}
              onPress={addPlayer}
              activeOpacity={0.8}
              disabled={drafts.length >= 20}>
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={[styles.addBtnText, { color: '#fff' }]}>Spieler hinzufügen</Text>
            </TouchableOpacity>

            <View style={{ height: 120 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: setupValid ? colors.primary : colors.muted }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleGoToDraw(); }}
            disabled={!setupValid}
            activeOpacity={0.8}>
            <Ionicons name="shuffle" size={20} color={setupValid ? '#fff' : colors.mutedForeground} />
            <Text style={[styles.primaryBtnText, { color: setupValid ? '#fff' : colors.mutedForeground }]}>
              Auslosung starten
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── STEP: DRAW ───────────────────────────────────────────────────────────────
  if (step === 'draw') {
    // Use the players captured at draw time — rebuilding here would mint new IDs
    // that no longer match the playerIds stored in previewPairs, leaving every
    // pair card empty.
    const players = drawnPlayers;
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.pad, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 130 }]}
          showsVerticalScrollIndicator={false}>

          <TouchableOpacity style={styles.backRow} onPress={() => setStep('setup')} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={[styles.backText, { color: colors.primary }]}>{count} Spieler</Text>
          </TouchableOpacity>

          <Text style={[styles.drawTitle, { color: colors.foreground }]}>Auslosung</Text>
          <Text style={[styles.drawSub, { color: colors.mutedForeground }]}>
            {previewPairs.length} Doppel · Stark + Schwach kombiniert
          </Text>

          {previewPairs.map((pair, i) => {
            const isTriple = pair.playerIds.length === 3;
            const pairPlayers = pair.playerIds.map(id => players.find(p => p.id === id));
            const label = String.fromCharCode(65 + i); // A, B, C, ...
            return (
              <View key={pair.id} style={[styles.pairCard, {
                borderColor: isTriple ? colors.primary : colors.border,
                backgroundColor: colors.card,
              }]}>
                <View style={[styles.pairLabel, { backgroundColor: isTriple ? colors.primary : colors.secondary }]}>
                  <Text style={[styles.pairLabelText, { color: isTriple ? '#fff' : colors.mutedForeground }]}>
                    {label}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  {pairPlayers.map((p, pi) => p ? (
                    <View key={pi} style={styles.pairPlayerRow}>
                      <Text style={[styles.pairPlayerName, { color: colors.foreground }]}>{p.name}</Text>
                      <Text style={[styles.pairPlayerTTR, { color: colors.primary }]}>{p.ttr}</Text>
                      {isTriple && pi === 2 && (
                        <View style={[styles.tripleTag, { backgroundColor: colors.accent }]}>
                          <Text style={[styles.tripleTagText, { color: colors.primary }]}>Dreier</Text>
                        </View>
                      )}
                    </View>
                  ) : null)}
                </View>
                {isTriple && (
                  <Ionicons name="refresh-circle" size={22} color={colors.primary} />
                )}
              </View>
            );
          })}

          {/* Redraw hint */}
          <TouchableOpacity style={styles.redrawBtn} onPress={handleRedraw} activeOpacity={0.7}>
            <Ionicons name="shuffle" size={16} color={colors.mutedForeground} />
            <Text style={[styles.redrawText, { color: colors.mutedForeground }]}>Neu auslosen</Text>
          </TouchableOpacity>

          {hasTriple && (
            <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                Das Dreier-Doppel rotiert: bei jedem Spiel pausiert einer der drei Spieler abwechselnd.
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleStartTournament}
            activeOpacity={0.8}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={[styles.primaryBtnText, { color: '#fff' }]}>Turnier starten</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── STEP: MATCHES ────────────────────────────────────────────────────────────
  if (!tournament) return null;

  const standings = calculateDoublesStandings(tournament);
  const currentRound = tournament.currentRound ?? 1;
  const totalRounds = tournament.totalRounds ?? 0;
  const currentRoundMatches = tournament.matches.filter(m => m.round === currentRound);
  const roundCompletedCount = currentRoundMatches.filter(m => m.completed).length;
  const roundDone = currentRoundMatches.length > 0 && roundCompletedCount === currentRoundMatches.length;
  const moreRounds = currentRound < totalRounds;
  const allDone = tournament.matches.every(m => m.completed);

  const renderMatchCard = (m: DoublesMatch) => {
    const p1 = tournament.pairs.find(p => p.id === m.pair1Id)!;
    const p2 = tournament.pairs.find(p => p.id === m.pair2Id)!;
    const n1 = getMatchPlayerNames(p1, m.tripleActive1, tournament.players);
    const n2 = getMatchPlayerNames(p2, m.tripleActive2, tournament.players);
    const win1 = m.completed && (m.score1 ?? 0) > (m.score2 ?? 0);
    return (
      <TouchableOpacity
        key={m.id}
        style={[styles.matchCard, { borderColor: colors.border, backgroundColor: colors.card, opacity: m.completed ? 0.8 : 1 }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedMatch(m); }}
        activeOpacity={0.8}>
        <View style={styles.matchTeam}>
          <Text style={[styles.matchTeamName, { color: m.completed && !win1 ? colors.mutedForeground : colors.foreground }]} numberOfLines={2}>{n1.line1}</Text>
          {n1.line2 && <Text style={[styles.matchTeamSub, { color: colors.destructive }]}>{n1.line2}</Text>}
        </View>
        <View style={[styles.matchScoreBox, { backgroundColor: colors.secondary }]}>
          {m.completed
            ? <Text style={[styles.matchScore, { color: colors.foreground }]}>{m.score1}:{m.score2}</Text>
            : <Text style={[styles.matchScoreDash, { color: colors.mutedForeground }]}>vs</Text>}
        </View>
        <View style={[styles.matchTeam, { alignItems: 'flex-end' }]}>
          <Text style={[styles.matchTeamName, { color: m.completed && win1 ? colors.mutedForeground : colors.foreground, textAlign: 'right' }]} numberOfLines={2}>{n2.line1}</Text>
          {n2.line2 && <Text style={[styles.matchTeamSub, { color: colors.destructive, textAlign: 'right' }]}>{n2.line2}</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  const renderCurrentRound = () => (
    <>
      {/* Round header */}
      <View style={[styles.roundHeaderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.roundHeaderTitle, { color: colors.foreground }]}>
            {'Runde '}
            <Text style={{ color: colors.primary }}>{currentRound}</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>{` von ${totalRounds}`}</Text>
          </Text>
          <Text style={[styles.roundHeaderSub, { color: colors.mutedForeground }]}>
            {roundCompletedCount} von {currentRoundMatches.length} {currentRoundMatches.length === 1 ? 'Spiel' : 'Spielen'} abgeschlossen
          </Text>
        </View>
        {roundDone && <Ionicons name="checkmark-circle" size={26} color={colors.primary} />}
      </View>
      {currentRoundMatches.map(renderMatchCard)}
    </>
  );

  const renderStandings = () => (
    <>
      {allDone && standings[0] && (
        <View style={[styles.winnerBanner, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
          <Ionicons name="trophy" size={20} color={colors.primary} />
          <Text style={[styles.winnerText, { color: colors.primary }]}>
            Sieger: {standings[0].pair.displayName}
          </Text>
        </View>
      )}
      <View style={[styles.standTable, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={[styles.standRow, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.standCell, styles.rankCell, { color: colors.mutedForeground }]}>#</Text>
          <Text style={[styles.standCell, { flex: 1, color: colors.mutedForeground }]}>Doppel</Text>
          <Text style={[styles.standCell, styles.numCell, { color: colors.mutedForeground }]}>S</Text>
          <Text style={[styles.standCell, styles.numCell, { color: colors.mutedForeground }]}>N</Text>
          <Text style={[styles.standCell, styles.numCell, { color: colors.mutedForeground }]}>Sätze</Text>
          <Text style={[styles.standCell, styles.numCell, { color: colors.primary }]}>Pkt</Text>
        </View>
        {standings.map((s, i) => {
          const label = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
          const bg = i === 0 ? '#fffbeb' : i === 1 ? '#f8fafc' : i === 2 ? '#fff7f0' : 'transparent';
          return (
            <View key={s.pair.id} style={[styles.standRow, { backgroundColor: bg, borderTopColor: colors.border, borderTopWidth: i > 0 ? 1 : 0 }]}>
              <Text style={[styles.standCell, styles.rankCell, { color: colors.foreground }]}>{label}</Text>
              <Text style={[styles.standCell, { flex: 1, color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{s.pair.displayName}</Text>
              <Text style={[styles.standCell, styles.numCell, { color: colors.foreground }]}>{s.wins}</Text>
              <Text style={[styles.standCell, styles.numCell, { color: colors.foreground }]}>{s.losses}</Text>
              <Text style={[styles.standCell, styles.numCell, { color: colors.foreground }]}>{s.setsWon}:{s.setsLost}</Text>
              <Text style={[styles.standCell, styles.numCell, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{s.points}</Text>
            </View>
          );
        })}
      </View>
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.headerActionBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={[styles.headerActionLabel, { color: colors.primary }]}>Zurück</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {tournament.name}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            Runde {currentRound} von {totalRounds} · {tournament.pairs.length} Doppel
          </Text>
        </View>
        <TouchableOpacity onPress={handleExportPdf} activeOpacity={0.7} style={styles.headerActionBtn} disabled={exporting}>
          <Ionicons name={exporting ? 'hourglass-outline' : 'share-outline'} size={20} color={colors.primary} />
          <Text style={[styles.headerActionLabel, { color: colors.primary }]}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={styles.headerActionBtn}>
          <Ionicons name="refresh" size={20} color={colors.mutedForeground} />
          <Text style={[styles.headerActionLabel, { color: colors.mutedForeground }]}>Neu</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['spiele', 'tabelle'] as ActiveTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}>
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
              {tab === 'spiele' ? 'Spiele' : 'Tabelle'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        {activeTab === 'spiele' ? renderCurrentRound() : renderStandings()}
      </ScrollView>

      {/* Bottom action */}
      {roundDone && moreRounds && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleAdvanceRound}
            activeOpacity={0.8}>
            <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
            <Text style={[styles.primaryBtnText, { color: '#fff' }]}>Runde {currentRound + 1} starten</Text>
          </TouchableOpacity>
        </View>
      )}
      {allDone && standings[0] && !moreRounds && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, gap: 8 }]}>
          <View style={[styles.winnerBanner, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
            <Ionicons name="trophy" size={20} color={colors.primary} />
            <Text style={[styles.winnerText, { color: colors.primary }]}>
              Sieger: {standings[0].pair.displayName}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleExportPdf}
            disabled={exporting}
            activeOpacity={0.8}>
            <Ionicons name={exporting ? 'hourglass-outline' : 'share-outline'} size={20} color="#fff" />
            <Text style={[styles.primaryBtnText, { color: '#fff' }]}>Ergebnisse als PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
            onPress={handleReset}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.mutedForeground }]}>Turnier beenden</Text>
          </TouchableOpacity>
        </View>
      )}

      <DoublesScoreModal
        match={selectedMatch}
        tournament={tournament}
        onClose={() => setSelectedMatch(null)}
        onSave={handleSaveScore}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1 },
    pad: { paddingHorizontal: 16, paddingBottom: 40 },
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
    backText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },

    // Setup
    setupHeader: { alignItems: 'center', marginBottom: 20, gap: 8 },
    iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center' },
    sub: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
    nameWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
    nameInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, fontFamily: 'Inter_400Regular' },
    countBadge: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'center', marginBottom: 18 },
    countText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
    colHeaderRow: { marginBottom: 6 },
    colHeader: { fontSize: 10, fontFamily: 'Inter_400Regular', letterSpacing: 0.3, marginLeft: 4 },
    colHint: { fontSize: 10, fontFamily: 'Inter_400Regular', fontStyle: 'italic', marginLeft: 4, marginTop: 1 },
    playerRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
    playerNum: { width: 36, height: 48, alignItems: 'center', justifyContent: 'center' },
    playerNumText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    nameFieldInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, fontFamily: 'Inter_400Regular', borderRightWidth: 1 },
    ttrInput: { width: 70, height: 48, paddingHorizontal: 10, fontSize: 14, fontFamily: 'Inter_700Bold', textAlign: 'center' },
    removeBtn: { padding: 10, paddingLeft: 4 },
    suggestRow: { marginBottom: 6, marginTop: -2 },
    suggestPill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
    suggestPillText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, paddingVertical: 14, gap: 6, marginTop: 8 },
    addBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10 },
    primaryBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },

    // Draw
    drawTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', marginBottom: 4 },
    drawSub: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 20 },
    pairCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, marginBottom: 10, overflow: 'hidden', gap: 12, paddingRight: 12 },
    pairLabel: { width: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
    pairLabelText: { fontSize: 18, fontFamily: 'Inter_700Bold' },
    pairPlayerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    pairPlayerName: { flex: 1, fontSize: 15, fontFamily: 'Inter_600SemiBold' },
    pairPlayerTTR: { fontSize: 14, fontFamily: 'Inter_700Bold' },
    tripleTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    tripleTagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
    redrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16, marginTop: 4 },
    redrawText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
    infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 8 },
    infoText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },

    // Tournament header
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
    headerBack: { padding: 6 },
    headerActionBtn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 4, gap: 2 },
    headerActionLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
    headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
    headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 13 },
    tabText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },

    // Round header
    roundHeaderCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14, gap: 12 },
    roundHeaderTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 2 },
    roundHeaderSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },

    // Match cards
    sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
    matchCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 8, padding: 12, gap: 10 },
    matchTeam: { flex: 1 },
    matchTeamName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
    matchTeamSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
    matchScoreBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', minWidth: 52 },
    matchScoreDash: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
    matchScore: { fontSize: 18, fontFamily: 'Inter_700Bold' },

    // Standings
    winnerBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 14, padding: 14, marginBottom: 16 },
    winnerText: { flex: 1, fontSize: 15, fontFamily: 'Inter_700Bold' },
    standTable: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
    standRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
    standCell: { fontSize: 13, fontFamily: 'Inter_400Regular' },
    rankCell: { width: 32, fontFamily: 'Inter_700Bold' },
    numCell: { width: 36, textAlign: 'right', fontFamily: 'Inter_600SemiBold' },
  });
}
