import { AppIcon as Ionicons } from '@/components/AppIcon';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CsvImportModal } from '@/components/CsvImportModal';
import { EditPlayersModal } from '@/components/EditPlayersModal';
import { MatchCard } from '@/components/MatchCard';
import { ScoreModal } from '@/components/ScoreModal';
import { confirmDialog, notify } from '@/utils/dialog';
import { exportTournamentPdf } from '@/utils/exportPdf';
import { StandingsTable } from '@/components/StandingsTable';
import { useTournament } from '@/context/TournamentContext';
import { useColors } from '@/hooks/useColors';
import { usePlayerNames } from '@/hooks/usePlayerNames';
import { Match, Player, TournamentMode } from '@/types';
import { getPlayerName, getPlayerTTR, isTwoGroupTournament, isThreeGroupTournament, seedGroupsByTTR, seedThreeGroupsByTTR, SWISS_MIN_PLAYERS, SWISS_TOTAL_ROUNDS } from '@/utils/tournament';

type SetupStep = 'players' | 'mode';
type MainTab = 'spiele' | 'tabelle';

interface PlayerDraft {
  name: string;
  ttr: string;
}

const EMPTY_PLAYER: PlayerDraft = { name: '', ttr: '' };

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    tournament,
    loading,
    startTournament,
    updateMatch,
    updatePlayer,
    startKOPhase,
    advanceSwissRound,
    advanceRRRound,
    resetTournament,
    getGroupStandings,
    isGroupDone,
    isSwissDone,
    isTwoGroup,
    isThreeGroup,
    winner,
  } = useTournament();

  const [drafts, setDrafts] = useState<PlayerDraft[]>(Array(6).fill(null).map(() => ({ ...EMPTY_PLAYER })));
  const [tournamentName, setTournamentName] = useState('');
  const [setupStep, setSetupStep] = useState<SetupStep>('players');
  const [activeTab, setActiveTab] = useState<MainTab>('spiele');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [editPlayersVisible, setEditPlayersVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [focusedNameIdx, setFocusedNameIdx] = useState<number | null>(null);
  const { saveNames, getSuggestions } = usePlayerNames();

  const endDialogShown = useRef(false);
  useEffect(() => {
    if (!tournament) { endDialogShown.current = false; return; }
    const swissMode = tournament.mode === 'swiss';
    const simpleKOMode = tournament.mode === 'simpleko';
    const done =
      (swissMode && isSwissDone) ||
      (simpleKOMode && tournament.phase === 'finished') ||
      (!swissMode && !simpleKOMode && !isTwoGroup && !isThreeGroup && isGroupDone && tournament.phase !== 'knockout');
    if (done && !endDialogShown.current) {
      endDialogShown.current = true;
      confirmDialog({
        title: 'Turnier beendet 🏆',
        message: 'Möchten Sie das Ergebnis als PDF speichern?',
        confirmText: 'PDF speichern',
        cancelText: 'Nein, danke',
        onConfirm: async () => {
          setExporting(true);
          try { await exportTournamentPdf(tournament); }
          catch { notify('Fehler', 'Export fehlgeschlagen.'); }
          finally { setExporting(false); }
        },
      });
    }
    if (!done) endDialogShown.current = false;
  }, [tournament, isSwissDone, isGroupDone, isTwoGroup, isThreeGroup]);

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const styles = makeStyles(colors);

  if (loading) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]} />;
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────────

  const validPlayers: PlayerDraft[] = drafts.filter(d => d.name.trim().length > 0);
  const count = validPlayers.length;
  const setupValid = count >= 5 && count <= 24;

  const noTTRMode = validPlayers.every(d => d.ttr.trim().length === 0);

  const buildPlayers = (): Player[] =>
    validPlayers.map((d, i) => ({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 6),
      name: d.name.trim(),
      // No TTR entered → use entry order as seeding (first = strongest)
      ttr: d.ttr.trim().length > 0 && !isNaN(Number(d.ttr))
        ? Number(d.ttr)
        : noTTRMode
          ? 1000 - i
          : 0,
    }));

  const twoGroupPreview = count >= 9 && count <= 16 ? (() => {
    const players = buildPlayers();
    const { A, B } = seedGroupsByTTR(players);
    return {
      A: A.map(id => players.find(p => p.id === id)!),
      B: B.map(id => players.find(p => p.id === id)!),
    };
  })() : null;

  const threeGroupPreview = count >= 17 ? (() => {
    const players = buildPlayers();
    const { A, B, C } = seedThreeGroupsByTTR(players);
    return {
      A: A.map(id => players.find(p => p.id === id)!),
      B: B.map(id => players.find(p => p.id === id)!),
      C: C.map(id => players.find(p => p.id === id)!),
    };
  })() : null;

  // ── SETUP — STEP 1: SPIELER EINGEBEN ────────────────────────────────────────
  if (!tournament && setupStep === 'players') {
    const handleCsvImport = (imported: { name: string; ttr: number }[]) => {
      const newDrafts = imported.map(p => ({ name: p.name, ttr: String(p.ttr) }));
      setDrafts(prev => {
        // Replace empty slots first, then append
        const filled = prev.filter(d => d.name.trim().length > 0);
        const combined = [...filled, ...newDrafts].slice(0, 24);
        return combined;
      });
    };

    const addPlayer = () => {
      if (drafts.length >= 24) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDrafts(prev => [...prev, { ...EMPTY_PLAYER }]);
    };
    const removePlayer = (i: number) => {
      if (drafts.length <= 1) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setDrafts(prev => prev.filter((_, idx) => idx !== i));
    };

    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* Help shortcut — top right */}
        <TouchableOpacity
          style={[styles.helpFloatBtn, { top: insets.top + webTop + 6 }]}
          onPress={() => router.push('/help')}
          activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={28} color={colors.mutedForeground} />
        </TouchableOpacity>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={[styles.setupPad, { paddingTop: insets.top + webTop + 20 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* App Header — compact horizontal */}
            <View style={styles.setupHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="trophy" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.appTitle, { color: colors.foreground }]}>Turnier-App TV Stetten</Text>
                <Text style={[styles.appSub, { color: colors.mutedForeground }]}>Tischtennis Turniersystem</Text>
              </View>
            </View>

            {/* Tournament Name Input */}
            <View style={[styles.nameFieldWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="ribbon-outline" size={18} color={colors.primary} style={{ marginLeft: 12 }} />
              <TextInput
                style={[styles.nameFieldInput, { color: colors.foreground }]}
                placeholder="Turniername (z.B. Vereinsmeisterschaft 2025)"
                placeholderTextColor={colors.mutedForeground}
                value={tournamentName}
                onChangeText={setTournamentName}
                returnKeyType="done"
                autoCapitalize="words"
                maxLength={60}
              />
            </View>

            {/* Player list header: count + column labels in one row */}
            <View style={styles.listHeader}>
              {/* Count chip */}
              <View style={[styles.countChip, { backgroundColor: count >= 5 ? colors.primary : colors.secondary }]}>
                <Text style={[styles.countChipText, { color: count >= 5 ? '#fff' : colors.mutedForeground }]}>
                  {count} {count === 1 ? 'Spieler' : 'Spieler'}
                  {count >= 17 ? ' · 3 Gruppen' : count >= 9 ? ' · 2 Gruppen' : count >= 5 ? ' · 1 Gruppe' : ''}
                </Text>
              </View>

              {/* Column labels aligned to inputs */}
              <View style={styles.colLabels}>
                <Text style={[styles.colLabelNum, { color: colors.mutedForeground }]}>#</Text>
                <Text style={[styles.colLabelName, { color: colors.mutedForeground }]}>Name</Text>
                <Text style={[styles.colLabelTTR, { color: colors.mutedForeground }]}>TTR</Text>
              </View>
            </View>

            {/* Seeding hint */}
            {count >= 1 && (
              <View style={[styles.seedingHint, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Ionicons name="information-circle-outline" size={13} color={colors.mutedForeground} />
                <Text style={[styles.seedingHintText, { color: colors.mutedForeground }]}>
                  {noTTRMode && count >= 5
                    ? 'Setzung nach Eingabereihenfolge — Spieler 1 gilt als Stärkster'
                    : 'TTR leer lassen → Eingabereihenfolge gilt als Setzung'}
                </Text>
              </View>
            )}

            {drafts.map((d, i) => {
              const skip = drafts.map(x => x.name.trim()).filter(Boolean);
              const suggestions = focusedNameIdx === i ? getSuggestions(d.name, skip) : [];
              return (
                <React.Fragment key={i}>
                  <View style={[styles.playerRow, {
                    borderColor: d.name.trim() ? colors.primary + '40' : colors.border,
                    backgroundColor: colors.card,
                  }]}>
                    <View style={[styles.playerNum, {
                      backgroundColor: d.name.trim() ? colors.accent : colors.secondary,
                    }]}>
                      <Text style={[styles.playerNumText, {
                        color: d.name.trim() ? colors.primary : colors.mutedForeground,
                      }]}>{i + 1}</Text>
                    </View>
                    <TextInput
                      style={[styles.nameInput, { color: colors.foreground, borderRightColor: colors.border }]}
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
                      placeholder="opt."
                      placeholderTextColor={colors.mutedForeground}
                      value={d.ttr}
                      onChangeText={val => setDrafts(prev => prev.map((p, idx) => idx === i ? { ...p, ttr: val } : p))}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      maxLength={4}
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

            <View style={styles.addRow}>
              <TouchableOpacity
                style={[styles.addBtn, { borderColor: colors.primary, backgroundColor: colors.primary, flex: 1 }]}
                onPress={addPlayer}
                activeOpacity={0.8}
                disabled={drafts.length >= 24}>
                <Ionicons name="person-add" size={20} color="#fff" />
                <Text style={[styles.addBtnText, { color: '#fff' }]}>Spieler hinzufügen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { borderColor: colors.border, backgroundColor: colors.card, flex: 1 }]}
                onPress={() => setCsvModalVisible(true)}
                activeOpacity={0.8}>
                <Ionicons name="download-outline" size={20} color={colors.foreground} />
                <Text style={[styles.addBtnText, { color: colors.foreground }]}>CSV importieren</Text>
              </TouchableOpacity>
            </View>

            {count > 0 && count < 5 && (
              <Text style={[styles.warnText, { color: colors.destructive }]}>
                Mindestens 5 Spieler erforderlich
              </Text>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: setupValid ? colors.primary : colors.muted }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setSetupStep('mode');
            }}
            activeOpacity={0.8}
            disabled={!setupValid}>
            <Text style={[styles.primaryBtnText, { color: setupValid ? '#fff' : colors.mutedForeground }]}>
              Weiter — Modus wählen
            </Text>
            <Ionicons name="arrow-forward" size={18} color={setupValid ? '#fff' : colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <CsvImportModal
          visible={csvModalVisible}
          onClose={() => setCsvModalVisible(false)}
          onImport={handleCsvImport}
        />
      </View>
    );
  }

  // ── SETUP — STEP 2: MODUS WÄHLEN ─────────────────────────────────────────────
  if (!tournament && setupStep === 'mode') {
    const players = buildPlayers();

    const handleSelect = (mode: TournamentMode) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      saveNames(players.map(p => p.name));
      startTournament(players, mode, tournamentName);
    };

    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[styles.setupPad, { paddingTop: insets.top + webTop + 20, paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}>

          {/* Back + Help */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 0 }}>
            <TouchableOpacity
              style={[styles.backRow, { flex: 1, marginBottom: 0 }]}
              onPress={() => setSetupStep('players')}
              activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={[styles.backText, { color: colors.primary }]}>{count} Spieler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/help')} activeOpacity={0.7} style={{ padding: 8 }}>
              <Ionicons name="help-circle-outline" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.modeTitle, { color: colors.foreground }]}>Spielmodus wählen</Text>
          <Text style={[styles.modeSub2, { color: colors.mutedForeground }]}>
            Wie soll das Turnier gespielt werden?
          </Text>

          {/* Round Robin Card */}
          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSelect('roundrobin')}
            activeOpacity={0.85}>
            <View style={[styles.modeIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="grid" size={28} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeCardTitle, { color: colors.foreground }]}>Jeder gegen Jeden</Text>
              <Text style={[styles.modeCardDesc, { color: colors.mutedForeground }]}>
                {count <= 8
                  ? `Alle ${count} Spieler spielen in einer Gruppe — ${count * (count - 1) / 2} Spiele`
                  : count <= 16
                    ? `${count} Spieler in 2 Gruppen (TTR-Setzung). Top 2 jeder Gruppe ins Halbfinale`
                    : `${count} Spieler in 3 Gruppen (TTR-Setzung). Viertelfinale mit 8 Teilnehmern`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Swiss System Card */}
          {(() => {
            const swissEnabled = count >= SWISS_MIN_PLAYERS;
            return (
              <TouchableOpacity
                style={[styles.modeCard, { backgroundColor: colors.card, borderColor: swissEnabled ? colors.border : colors.border }, !swissEnabled && { opacity: 0.45 }]}
                onPress={() => swissEnabled && handleSelect('swiss')}
                activeOpacity={swissEnabled ? 0.85 : 1}>
                <View style={[styles.modeIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="git-network" size={28} color="#d97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeCardTitle, { color: colors.foreground }]}>Schweizer System</Text>
                  <Text style={[styles.modeCardDesc, { color: colors.mutedForeground }]}>
                    {swissEnabled
                      ? `Immer ${SWISS_TOTAL_ROUNDS} Runden, kein Ausscheiden. Paarung nach Punktgleichstand — Runde 1 nach TTR-Setzung`
                      : `Mindestens ${SWISS_MIN_PLAYERS} Spieler erforderlich (aktuell ${count})`}
                  </Text>
                </View>
                {swissEnabled
                  ? <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                  : <Ionicons name="lock-closed" size={18} color={colors.mutedForeground} />}
              </TouchableOpacity>
            );
          })()}

          {/* Simple KO Card */}
          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleSelect('simpleko')}
            activeOpacity={0.85}>
            <View style={[styles.modeIcon, { backgroundColor: '#fce7f3' }]}>
              <Ionicons name="flash" size={28} color="#db2777" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeCardTitle, { color: colors.foreground }]}>Einfaches KO</Text>
              <Text style={[styles.modeCardDesc, { color: colors.mutedForeground }]}>
                {`Direktes Ausscheidungsturnier — ${count} Spieler, TTR-Setzung, ${Math.ceil(Math.log2(Math.max(count, 2)))} Runden`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Doubles Card */}
          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/doubles')}
            activeOpacity={0.85}>
            <View style={[styles.modeIcon, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="people" size={28} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeCardTitle, { color: colors.foreground }]}>Doppelturnier</Text>
              <Text style={[styles.modeCardDesc, { color: colors.mutedForeground }]}>
                Jeder gegen Jeden mit festen Doppelpartnern — eigene Spielerliste und einmalige Auslosung
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Group preview for 9–16 players (2 groups) */}
          {twoGroupPreview && (
            <View style={[styles.groupPreviewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.groupPreviewTitle, { color: colors.mutedForeground }]}>
                Automatische Gruppenauslosung (TTR-Setzung)
              </Text>
              {(['A', 'B'] as const).map(grp => (
                <View key={grp} style={styles.groupPreviewRow}>
                  <Text style={[styles.groupPreviewLabel, { color: colors.primary }]}>Gruppe {grp}</Text>
                  <Text style={[styles.groupPreviewPlayers, { color: colors.foreground }]}>
                    {twoGroupPreview[grp].map(p => `${p.name} (${p.ttr})`).join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Group preview for 17–24 players (3 groups) */}
          {threeGroupPreview && (
            <View style={[styles.groupPreviewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.groupPreviewTitle, { color: colors.mutedForeground }]}>
                Automatische Gruppenauslosung (TTR-Setzung) — 3 Gruppen
              </Text>
              {(['A', 'B', 'C'] as const).map(grp => (
                <View key={grp} style={styles.groupPreviewRow}>
                  <Text style={[styles.groupPreviewLabel, { color: colors.primary }]}>Gruppe {grp}</Text>
                  <Text style={[styles.groupPreviewPlayers, { color: colors.foreground }]}>
                    {threeGroupPreview[grp].map(p => `${p.name} (${p.ttr})`).join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Swiss seeding preview — fold pairing */}
          {count >= SWISS_MIN_PLAYERS && (
            <View style={[styles.groupPreviewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.groupPreviewTitle, { color: colors.mutedForeground }]}>
                Schweizer System — Runde 1 Paarungen (Fold-Setzung)
              </Text>
              {(() => {
                const sorted = [...players].sort((a, b) => b.ttr - a.ttr);
                const pairs: string[] = [];
                let forPairing = sorted;
                if (sorted.length % 2 === 1) {
                  const last = sorted[sorted.length - 1];
                  pairs.push(`${last.name} (${last.ttr}) — Freilos`);
                  forPairing = sorted.slice(0, sorted.length - 1);
                }
                const half = forPairing.length / 2;
                const upper = forPairing.slice(0, half);
                const lower = forPairing.slice(half);
                upper.forEach((p, i) => {
                  pairs.unshift(`${p.name} (${p.ttr}) vs ${lower[i].name} (${lower[i].ttr})`);
                });
                return pairs.map((p, i) => (
                  <Text key={i} style={[styles.groupPreviewPlayers, { color: colors.foreground }]}>
                    {`${i + 1}. ${p}`}
                  </Text>
                ));
              })()}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── TOURNAMENT SCREEN ─────────────────────────────────────────────────────────
  if (!tournament) return null;

  const isSwiss = tournament.mode === 'swiss';
  const groupMatches = tournament.matches.filter(m => m.phase === 'group');

  const handleReset = () => {
    const finish = () => {
      resetTournament();
      setDrafts(Array(6).fill(null).map(() => ({ ...EMPTY_PLAYER })));
      setTournamentName('');
      setSetupStep('players');
      setActiveTab('spiele');
      setSelectedMatch(null);
      setCsvModalVisible(false);
      setEditPlayersVisible(false);
      setFocusedNameIdx(null);
    };
    confirmDialog({
      title: 'Ergebnis als PDF exportieren?',
      message: 'Bei „Nein" gehen alle Daten des Turniers unwiderruflich verloren.',
      confirmText: 'Ja',
      cancelText: 'Nein',
      onConfirm: async () => {
        setExporting(true);
        try {
          await exportTournamentPdf(tournament);
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

  const renderCurrentRound = () => {
    const cur = tournament.currentRound;
    const currentRoundMatches = groupMatches.filter(m => m.round === cur);
    const completedCount = currentRoundMatches.filter(m => m.completed).length;
    const total = currentRoundMatches.length;
    const roundDone = total > 0 && completedCount === total;

    return (
      <>
        <View style={[styles.roundHeaderCard, {
          backgroundColor: colors.card,
          borderColor: roundDone ? colors.success : colors.border,
          borderLeftColor: roundDone ? colors.success : colors.primary,
          borderLeftWidth: 4,
        }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.roundHeaderTitle, { color: colors.foreground }]}>
              {'Runde '}
              <Text style={{ color: colors.primary }}>{cur}</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }}>{` von ${tournament.totalRounds}`}</Text>
            </Text>
            <Text style={[styles.roundHeaderSub, { color: colors.mutedForeground }]}>
              {completedCount} von {total} {total === 1 ? 'Spiel' : 'Spielen'} abgeschlossen
            </Text>
          </View>
          {roundDone
            ? <Ionicons name="checkmark-circle" size={26} color={colors.success} />
            : <View style={[styles.roundProgress, { backgroundColor: colors.secondary }]}>
                <View style={[styles.roundProgressFill, {
                  backgroundColor: colors.primary,
                  width: `${total > 0 ? (completedCount / total) * 100 : 0}%` as unknown as number,
                }]} />
              </View>
          }
        </View>

        {(isTwoGroup || isThreeGroup)
          ? (['A', 'B', 'C'] as const).filter(grp => grp !== 'C' || isThreeGroup).map(grp => {
              const grpMatches = currentRoundMatches.filter(m => m.group === grp);
              if (!grpMatches.length) return null;
              const grpColors: Record<string, string> = { A: colors.primary, B: '#3b82f6', C: '#10b981' };
              return (
                <View key={grp}>
                  <View style={styles.sectionLabelRow}>
                    <View style={[styles.sectionDot, { backgroundColor: grpColors[grp] ?? colors.primary }]} />
                    <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginBottom: 0 }]}>GRUPPE {grp}</Text>
                  </View>
                  {grpMatches.map(m => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      tournament={tournament}
                      onPress={m.player2Id === 'BYE' || m.player1Id === 'BYE' ? () => {} : setSelectedMatch}
                    />
                  ))}
                </View>
              );
            })
          : currentRoundMatches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                tournament={tournament}
                onPress={m.player2Id === 'BYE' || m.player1Id === 'BYE' ? () => {} : setSelectedMatch}
              />
            ))
        }
      </>
    );
  };

  const standingsA = (isTwoGroup || isThreeGroup) ? getGroupStandings('A') : [];
  const standingsB = (isTwoGroup || isThreeGroup) ? getGroupStandings('B') : [];
  const standingsC = isThreeGroup ? getGroupStandings('C') : [];
  const standingsSingle = (!isTwoGroup && !isThreeGroup) ? getGroupStandings('none') : [];

  const renderStandings = () => {
    if (isThreeGroup) {
      return (
        <>
          <StandingsTable standings={standingsA} tournament={tournament} title="GRUPPE A" />
          <StandingsTable standings={standingsB} tournament={tournament} title="GRUPPE B" />
          <StandingsTable standings={standingsC} tournament={tournament} title="GRUPPE C" />
        </>
      );
    }
    if (isTwoGroup) {
      return (
        <>
          <StandingsTable standings={standingsA} tournament={tournament} title="GRUPPE A" />
          <StandingsTable standings={standingsB} tournament={tournament} title="GRUPPE B" />
        </>
      );
    }
    const isSimpleKO = tournament.mode === 'simpleko';
    const title = isSwiss
      ? `SCHWEIZER SYSTEM — RUNDE ${tournament.currentRound}/${tournament.totalRounds}`
      : isSimpleKO
        ? `EINFACHES KO — RUNDE ${tournament.currentRound}/${tournament.totalRounds}`
        : 'TABELLE';
    return <StandingsTable standings={standingsSingle} tournament={tournament} title={title} />;
  };

  const renderBottomAction = () => {
    const cur = tournament.currentRound;
    const total = tournament.totalRounds;
    const currentRoundMatches = groupMatches.filter(m => m.round === cur);
    const roundDone = currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.completed);
    const moreRounds = cur < total;

    const isSimpleKO = tournament.mode === 'simpleko';

    // Simple KO: finished → winner
    if (isSimpleKO && tournament.phase === 'finished') {
      return (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12, gap: 8 }]}>
          <View style={[styles.winnerBanner, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
            <Ionicons name="trophy" size={22} color={colors.primary} />
            <Text style={[styles.winnerBannerText, { color: colors.primary }]}>
              Sieger: {getPlayerName(tournament, winner ?? '')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}>
            <Ionicons name={exporting ? 'hourglass-outline' : 'share-outline'} size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Ergebnisse als PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
            onPress={handleReset}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.mutedForeground }]}>Turnier beenden</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Current round done, more rounds to play (Simple KO handles this in ko.tsx automatically)
    if (roundDone && moreRounds && !isSimpleKO) {
      const advance = isSwiss ? advanceSwissRound : advanceRRRound;
      const label = `Runde ${cur + 1} starten`;
      return (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); advance(); }}
            activeOpacity={0.8}>
            <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>{label}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Swiss finished
    if (isSwiss && isSwissDone) {
      return (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12, gap: 8 }]}>
          <View style={[styles.winnerBanner, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
            <Ionicons name="trophy" size={22} color={colors.primary} />
            <Text style={[styles.winnerBannerText, { color: colors.primary }]}>
              Sieger: {getPlayerName(tournament, standingsSingle[0]?.playerId ?? '')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}>
            <Ionicons name={exporting ? 'hourglass-outline' : 'share-outline'} size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Ergebnisse als PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
            onPress={handleReset}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.mutedForeground }]}>Turnier beenden</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // RR two/three-group: all done → KO phase
    if (!isSwiss && !isSimpleKO && isGroupDone && (isTwoGroup || isThreeGroup) && tournament.phase === 'group') {
      return (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); startKOPhase(); router.push('/ko'); }}
            activeOpacity={0.8}>
            <Ionicons name="git-branch" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>KO-Phase starten</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // KO phase ongoing
    if (tournament.phase === 'knockout') {
      return (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/ko')}
            activeOpacity={0.8}>
            <Ionicons name="trophy" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Zur KO-Phase</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // RR single-group: all done → winner
    if (!isSwiss && !isSimpleKO && isGroupDone && !isTwoGroup && !isThreeGroup) {
      return (
        <View style={[styles.bottomAction, { paddingBottom: insets.bottom + 12, gap: 8 }]}>
          <View style={[styles.winnerBanner, { backgroundColor: colors.accent, borderColor: colors.primary }]}>
            <Ionicons name="trophy" size={22} color={colors.primary} />
            <Text style={[styles.winnerBannerText, { color: colors.primary }]}>
              Sieger: {getPlayerName(tournament, standingsSingle[0]?.playerId ?? '')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleExport}
            disabled={exporting}
            activeOpacity={0.8}>
            <Ionicons name={exporting ? 'hourglass-outline' : 'share-outline'} size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Ergebnisse als PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border }]}
            onPress={handleReset}
            activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={20} color={colors.mutedForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.mutedForeground }]}>Turnier beenden</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const isSimpleKOMode = tournament.mode === 'simpleko';
  const modeLabel = isSwiss
    ? `Schweizer System — Runde ${tournament.currentRound}/${tournament.totalRounds}`
    : isSimpleKOMode
      ? `Einfaches KO — Runde ${tournament.currentRound}/${tournament.totalRounds}`
      : tournament.totalRounds > 0
        ? `Runde ${tournament.currentRound} von ${tournament.totalRounds}`
        : `${tournament.players.length} Spieler`;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportTournamentPdf(tournament);
    } catch (e) {
      notify('Fehler', 'Export fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + webTop, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {tournament.name || 'Turnier-App TV Stetten'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>{modeLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <TouchableOpacity onPress={handleExport} activeOpacity={0.7} style={styles.resetBtn} disabled={exporting}>
            <Ionicons name={exporting ? 'hourglass-outline' : 'share-outline'} size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditPlayersVisible(true)} activeOpacity={0.7} style={styles.resetBtn}>
            <Ionicons name="create-outline" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} activeOpacity={0.7} style={styles.resetBtn}>
            <Ionicons name="refresh" size={22} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['spiele', 'tabelle'] as MainTab[]).map(tab => {
          const active = activeTab === tab;
          const icon = tab === 'spiele' ? (active ? 'list' : 'list-outline') : (active ? 'stats-chart' : 'stats-chart-outline');
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}>
              <Ionicons name={icon as any} size={18} color={active ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.tabBtnText, { color: active ? colors.primary : colors.mutedForeground }]}>
                {tab === 'spiele' ? 'Spiele' : 'Tabelle'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}>
        {activeTab === 'spiele' ? renderCurrentRound() : renderStandings()}
      </ScrollView>

      {renderBottomAction()}

      <ScoreModal
        match={selectedMatch}
        tournament={tournament}
        onClose={() => setSelectedMatch(null)}
        onSave={(id, s1, s2) => { updateMatch(id, s1, s2); setSelectedMatch(null); }}
      />

      <EditPlayersModal
        visible={editPlayersVisible}
        players={tournament.players}
        onClose={() => setEditPlayersVisible(false)}
        onSave={updatePlayer}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    setupPad: { paddingHorizontal: 16, paddingBottom: 40 },
    setupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    nameFieldWrap: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 12, marginBottom: 14, overflow: 'hidden',
    },
    nameFieldInput: {
      flex: 1, height: 48, paddingHorizontal: 10,
      fontSize: 14, fontFamily: 'Inter_400Regular',
    },
    iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    appTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', lineHeight: 22 },
    appSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
    listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    countChip: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12 },
    countChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    colLabels: { flexDirection: 'row', alignItems: 'center', gap: 0 },
    colLabelNum: { width: 36, fontSize: 10, fontFamily: 'Inter_600SemiBold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
    colLabelName: { flex: 1, fontSize: 10, fontFamily: 'Inter_600SemiBold', paddingLeft: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    colLabelTTR: { width: 70, fontSize: 10, fontFamily: 'Inter_600SemiBold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
    seedingHint: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      borderRadius: 8, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 8,
    },
    seedingHintText: { fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1 },
    playerRow: {
      flexDirection: 'row', alignItems: 'center',
      borderWidth: 1, borderRadius: 12, marginBottom: 8, overflow: 'hidden',
    },
    playerNum: { width: 36, height: 48, alignItems: 'center', justifyContent: 'center' },
    playerNumText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
    nameInput: { flex: 1, height: 48, paddingHorizontal: 10, fontSize: 14, fontFamily: 'Inter_400Regular', borderRightWidth: 1 },
    ttrInput: { width: 70, height: 48, paddingHorizontal: 10, fontSize: 14, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
    removeBtn: { padding: 12 },
    suggestRow: { marginBottom: 6, marginTop: -2 },
    suggestPill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
    suggestPillText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
    addRow: {
      flexDirection: 'row', gap: 10, marginTop: 10,
    },
    addBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      flexBasis: 0, minHeight: 58, borderRadius: 16, borderWidth: 1.5, paddingVertical: 15, paddingHorizontal: 14, gap: 8,
      overflow: 'hidden',
      shadowColor: '#020617', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
    },
    addBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
    warnText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 10 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10 },
    primaryBtn: {
      width: '100%', alignSelf: 'stretch',
      minHeight: 58, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', paddingVertical: 16, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      overflow: 'hidden',
      shadowColor: '#020617', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.16, shadowRadius: 8, elevation: 3,
    },
    primaryBtnText: { fontSize: 18, fontFamily: 'Inter_700Bold', color: '#fff' },
    // Mode selection
    backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
    backText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
    helpFloatBtn: { position: 'absolute', right: 10, zIndex: 10, padding: 10 },
    modeTitle: { fontSize: 24, fontFamily: 'Inter_700Bold', marginBottom: 6 },
    modeSub2: { fontSize: 14, fontFamily: 'Inter_400Regular', marginBottom: 24 },
    modeCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 14,
    },
    modeIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    modeCardTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', marginBottom: 4 },
    modeCardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
    groupPreviewBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 6, gap: 8 },
    groupPreviewTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
    groupPreviewRow: { gap: 2 },
    groupPreviewLabel: { fontSize: 12, fontFamily: 'Inter_700Bold' },
    groupPreviewPlayers: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
    // Tournament header
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
    },
    headerTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
    headerSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
    resetBtn: {
      width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 4,
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
    tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
    tabBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
    sectionLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
    sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 4 },
    sectionDot: { width: 8, height: 8, borderRadius: 4 },
    roundProgress: { width: 48, height: 6, borderRadius: 3, overflow: 'hidden' },
    roundProgressFill: { height: 6, borderRadius: 3 },
    doneLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 14, marginBottom: 8 },
    roundLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
    roundHeaderCard: {
      flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1,
      padding: 14, marginBottom: 14, gap: 12,
    },
    roundHeaderTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 2 },
    roundHeaderSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
    bottomAction: { paddingHorizontal: 16, paddingTop: 8 },
    winnerBanner: {
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
      flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5,
    },
    winnerBannerText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', flex: 1 },
  });
}
