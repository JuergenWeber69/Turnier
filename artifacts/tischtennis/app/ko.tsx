import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScoreModal } from '@/components/ScoreModal';
import { useTournament } from '@/context/TournamentContext';
import { useColors } from '@/hooks/useColors';
import { Match } from '@/types';
import { getKORoundName, getPlayerName } from '@/utils/tournament';

export default function KOScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tournament, updateMatch, winner, thirdPlace } = useTournament();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const styles = makeStyles(colors);

  if (!tournament) {
    router.replace('/');
    return null;
  }

  const name = (id: string) => getPlayerName(tournament, id);

  const matchWinner = (m: Match) => {
    if (!m.completed || m.score1 === null || m.score2 === null) return null;
    return m.score1 > m.score2 ? m.player1Id : m.player2Id;
  };

  const isTBD = (id: string) => id === 'TBD';

  // ── Simple KO bracket match renderer ────────────────────────────────────────
  const renderBracketMatch = (m: Match, label: string, isFeatured = false) => {
    const w = matchWinner(m);
    const isWinner1 = w === m.player1Id;
    const isWinner2 = w === m.player2Id;
    const pending = isTBD(m.player1Id) || isTBD(m.player2Id);
    const isBYE = m.player2Id === 'BYE';

    return (
      <TouchableOpacity
        key={m.id}
        style={[
          styles.matchBlock,
          isFeatured && styles.matchBlockFeatured,
          { borderColor: pending ? colors.border : colors.border, opacity: pending ? 0.45 : 1 },
        ]}
        onPress={() => { if (!pending && !isBYE) setSelectedMatch(m); }}
        activeOpacity={pending || isBYE ? 1 : 0.8}>
        <Text style={[styles.matchLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <View style={styles.matchRow}>
          <View style={styles.matchPlayer}>
            <Text
              style={[
                styles.matchPlayerName,
                { color: isTBD(m.player1Id) ? colors.mutedForeground : colors.foreground },
                isWinner1 && styles.matchWinnerName,
              ]}
              numberOfLines={1}>
              {isTBD(m.player1Id) ? '— noch offen —' : name(m.player1Id)}
            </Text>
            {isWinner1 && <Ionicons name="trophy" size={13} color={colors.primary} style={{ marginLeft: 4 }} />}
          </View>
          <View style={[styles.matchScoreBox, { backgroundColor: colors.secondary }]}>
            {m.completed ? (
              <Text style={[styles.matchScore, { color: colors.foreground }]}>
                {m.score1} : {m.score2}
              </Text>
            ) : (
              <Text style={[styles.matchScorePending, { color: colors.mutedForeground }]}>— : —</Text>
            )}
          </View>
          <View style={[styles.matchPlayer, styles.matchPlayerRight]}>
            {isWinner2 && <Ionicons name="trophy" size={13} color={colors.primary} style={{ marginRight: 4 }} />}
            <Text
              style={[
                styles.matchPlayerName,
                { color: isTBD(m.player2Id) ? colors.mutedForeground : colors.foreground },
                isWinner2 && styles.matchWinnerName,
              ]}
              numberOfLines={1}>
              {isTBD(m.player2Id) ? '— noch offen —' : name(m.player2Id)}
            </Text>
          </View>
        </View>
        {!m.completed && !pending && !isBYE && (
          <View style={styles.tapHint}>
            <Ionicons name="pencil" size={12} color={colors.mutedForeground} />
            <Text style={[styles.tapHintText, { color: colors.mutedForeground }]}>Tippen zum Eintragen</Text>
          </View>
        )}
        {isBYE && (
          <View style={styles.tapHint}>
            <Ionicons name="checkmark-circle-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.tapHintText, { color: colors.mutedForeground }]}>Freilos</Text>
          </View>
        )}
        {pending && (
          <View style={styles.tapHint}>
            <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
            <Text style={[styles.tapHintText, { color: colors.mutedForeground }]}>Wartet auf vorherige Runde</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Group-based KO match renderer ────────────────────────────────────────────
  const renderKOMatch = (m: Match, label: string, isFeatured = false) => {
    const w = matchWinner(m);
    const isWinner1 = w === m.player1Id;
    const isWinner2 = w === m.player2Id;
    return (
      <TouchableOpacity
        key={m.id}
        style={[styles.matchBlock, isFeatured && styles.matchBlockFeatured, { borderColor: colors.border }]}
        onPress={() => setSelectedMatch(m)}
        activeOpacity={0.8}>
        <Text style={[styles.matchLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <View style={styles.matchRow}>
          <View style={styles.matchPlayer}>
            <Text
              style={[styles.matchPlayerName, { color: colors.foreground }, isWinner1 && styles.matchWinnerName]}
              numberOfLines={1}>
              {name(m.player1Id)}
            </Text>
            {isWinner1 && <Ionicons name="trophy" size={13} color={colors.primary} style={{ marginLeft: 4 }} />}
          </View>
          <View style={[styles.matchScoreBox, { backgroundColor: colors.secondary }]}>
            {m.completed ? (
              <Text style={[styles.matchScore, { color: colors.foreground }]}>
                {m.score1} : {m.score2}
              </Text>
            ) : (
              <Text style={[styles.matchScorePending, { color: colors.mutedForeground }]}>— : —</Text>
            )}
          </View>
          <View style={[styles.matchPlayer, styles.matchPlayerRight]}>
            {isWinner2 && <Ionicons name="trophy" size={13} color={colors.primary} style={{ marginRight: 4 }} />}
            <Text
              style={[styles.matchPlayerName, { color: colors.foreground }, isWinner2 && styles.matchWinnerName]}
              numberOfLines={1}>
              {name(m.player2Id)}
            </Text>
          </View>
        </View>
        {!m.completed && (
          <View style={styles.tapHint}>
            <Ionicons name="pencil" size={12} color={colors.mutedForeground} />
            <Text style={[styles.tapHintText, { color: colors.mutedForeground }]}>Tippen zum Eintragen</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const allComplete = tournament.phase === 'finished' && winner;

  const qf1 = tournament.matches.find(m => m.phase === 'qf1');
  const qf2 = tournament.matches.find(m => m.phase === 'qf2');
  const qf3 = tournament.matches.find(m => m.phase === 'qf3');
  const qf4 = tournament.matches.find(m => m.phase === 'qf4');
  const hasQF = qf1 !== undefined;
  const qfComplete = !!(qf1?.completed && qf2?.completed && qf3?.completed && qf4?.completed);

  const semi1 = tournament.matches.find(m => m.phase === 'semi1');
  const semi2 = tournament.matches.find(m => m.phase === 'semi2');
  const finalMatch = tournament.matches.find(m => m.phase === 'final');
  const thirdMatch = tournament.matches.find(m => m.phase === 'third');
  const semisComplete = !!(semi1?.completed && semi2?.completed);

  const isSimpleKO = tournament.mode === 'simpleko';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + webTop, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isSimpleKO ? 'KO-Bracket' : 'KO-Phase'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>

        {/* Winner Banner */}
        {allComplete && (
          <View style={[styles.winnerCard, { backgroundColor: colors.primary }]}>
            <Ionicons name="trophy" size={40} color="#fff" />
            <Text style={styles.winnerLabel}>Turniersieger</Text>
            <Text style={styles.winnerName}>{name(winner!)}</Text>
            {thirdPlace && !isSimpleKO && (
              <Text style={styles.thirdPlaceText}>Platz 3: {name(thirdPlace)}</Text>
            )}
          </View>
        )}

        {/* ── SIMPLE KO: Full bracket ─────────────────────────────────────────── */}
        {isSimpleKO && (() => {
          const totalRounds = tournament.totalRounds;
          const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

          return (
            <>
              {rounds.map(r => {
                const roundMatches = tournament.matches.filter(
                  m => m.phase === 'group' && m.round === r,
                );
                const roundName = getKORoundName(r, totalRounds);
                const isFinal = r === totalRounds;
                // Hide BYE-only round 1 matches (skip showing bye matches unless final)
                const visible = roundMatches.filter(m => !(m.player2Id === 'BYE' && r === 1 && roundMatches.some(x => x.player2Id !== 'BYE')));
                const byeMatches = roundMatches.filter(m => m.player2Id === 'BYE');
                const realMatches = roundMatches.filter(m => m.player2Id !== 'BYE');

                return (
                  <View key={r}>
                    <View style={styles.roundHeader}>
                      <Text style={[styles.phaseLabel, { color: colors.mutedForeground }]}>
                        {roundName.toUpperCase()}
                      </Text>
                      {byeMatches.length > 0 && r === 1 && (
                        <Text style={[styles.byeNote, { color: colors.mutedForeground }]}>
                          {byeMatches.length} Freilos{byeMatches.length !== 1 ? 'e' : ''} (Beste {byeMatches.length}:{' '}
                          {byeMatches.map(m => name(m.player1Id)).join(', ')})
                        </Text>
                      )}
                    </View>

                    {realMatches.map((m, idx) => {
                      const matchLabel = realMatches.length === 1
                        ? roundName
                        : `${roundName} ${idx + 1}`;
                      return renderBracketMatch(m, matchLabel, isFinal && realMatches.length === 1);
                    })}

                    {r < totalRounds && (
                      <View style={[styles.bracket, { borderColor: colors.border }]}>
                        <Ionicons name="arrow-down" size={18} color={colors.mutedForeground} />
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          );
        })()}

        {/* ── 3-GROUP: QF → SF → Final ────────────────────────────────────────── */}
        {!isSimpleKO && hasQF && (
          <>
            <Text style={[styles.phaseLabel, { color: colors.mutedForeground }]}>VIERTELFINALE</Text>
            {qf1 && renderKOMatch(qf1, 'Viertelfinale 1')}
            {qf2 && renderKOMatch(qf2, 'Viertelfinale 2')}
            {qf3 && renderKOMatch(qf3, 'Viertelfinale 3')}
            {qf4 && renderKOMatch(qf4, 'Viertelfinale 4')}

            {qfComplete ? (
              semi1 ? (
                <>
                  <View style={[styles.bracket, { borderColor: colors.border }]}>
                    <Ionicons name="arrow-down" size={20} color={colors.mutedForeground} />
                  </View>
                  <Text style={[styles.phaseLabel, { color: colors.mutedForeground }]}>HALBFINALE</Text>
                  {semi1 && renderKOMatch(semi1, 'Halbfinale 1')}
                  {semi2 && renderKOMatch(semi2, 'Halbfinale 2')}
                  {semisComplete && finalMatch ? (
                    <>
                      <View style={[styles.bracket, { borderColor: colors.border }]}>
                        <Ionicons name="arrow-down" size={20} color={colors.mutedForeground} />
                      </View>
                      <Text style={[styles.phaseLabel, { color: colors.mutedForeground }]}>FINALE & PLATZ 3</Text>
                      {thirdMatch && renderKOMatch(thirdMatch, 'Spiel um Platz 3')}
                      {renderKOMatch(finalMatch, 'Finale', true)}
                    </>
                  ) : !semisComplete && (
                    <View style={[styles.waitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Ionicons name="time-outline" size={24} color={colors.mutedForeground} />
                      <Text style={[styles.waitText, { color: colors.mutedForeground }]}>
                        Finale & Spiel um Platz 3 werden nach den Halbfinalen freigeschaltet
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={[styles.waitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="time-outline" size={24} color={colors.mutedForeground} />
                  <Text style={[styles.waitText, { color: colors.mutedForeground }]}>
                    Halbfinale wird generiert…
                  </Text>
                </View>
              )
            ) : (
              <View style={[styles.waitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={24} color={colors.mutedForeground} />
                <Text style={[styles.waitText, { color: colors.mutedForeground }]}>
                  Halbfinale wird nach den Viertelfinals freigeschaltet
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── 2-GROUP: SF → Final ─────────────────────────────────────────────── */}
        {!isSimpleKO && !hasQF && (
          <>
            <Text style={[styles.phaseLabel, { color: colors.mutedForeground }]}>HALBFINALE</Text>
            {semi1 && renderKOMatch(semi1, '1. Gruppe A vs. 2. Gruppe B')}
            {semi2 && renderKOMatch(semi2, '1. Gruppe B vs. 2. Gruppe A')}
            {semisComplete && finalMatch ? (
              <>
                <View style={[styles.bracket, { borderColor: colors.border }]}>
                  <Ionicons name="arrow-down" size={20} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.phaseLabel, { color: colors.mutedForeground }]}>FINALE & PLATZ 3</Text>
                {thirdMatch && renderKOMatch(thirdMatch, 'Spiel um Platz 3')}
                {finalMatch && renderKOMatch(finalMatch, 'Finale', true)}
              </>
            ) : !semisComplete && (
              <View style={[styles.waitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={24} color={colors.mutedForeground} />
                <Text style={[styles.waitText, { color: colors.mutedForeground }]}>
                  Finale & Spiel um Platz 3 werden nach den Halbfinalen freigeschaltet
                </Text>
              </View>
            )}
          </>
        )}

      </ScrollView>

      {selectedMatch && (
        <ScoreModal
          match={selectedMatch}
          tournament={tournament}
          onClose={() => setSelectedMatch(null)}
          onSave={(id, s1, s2) => {
            updateMatch(id, s1, s2);
            setSelectedMatch(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 14,
      borderBottomWidth: 1,
    },
    backBtn: { padding: 10, marginLeft: -6 },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
    },
    content: {
      padding: 16,
      gap: 0,
    },
    winnerCard: {
      borderRadius: 20,
      padding: 28,
      alignItems: 'center',
      marginBottom: 28,
      gap: 6,
    },
    winnerLabel: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: 'rgba(255,255,255,0.8)',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    winnerName: {
      fontSize: 28,
      fontFamily: 'Inter_700Bold',
      color: '#fff',
      textAlign: 'center',
    },
    thirdPlaceText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: 'rgba(255,255,255,0.75)',
      marginTop: 4,
    },
    roundHeader: {
      marginBottom: 8,
      marginTop: 4,
      gap: 2,
    },
    phaseLabel: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    byeNote: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
    },
    matchBlock: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
      marginBottom: 10,
      gap: 10,
    },
    matchBlockFeatured: {
      borderWidth: 2,
      borderColor: '#f97316',
    },
    matchLabel: {
      fontSize: 11,
      fontFamily: 'Inter_500Medium',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    matchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    matchPlayer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    matchPlayerRight: {
      justifyContent: 'flex-end',
    },
    matchPlayerName: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
    },
    matchWinnerName: {
      fontFamily: 'Inter_700Bold',
      color: '#f97316',
    },
    matchScoreBox: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
      minWidth: 72,
    },
    matchScore: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
    },
    matchScorePending: {
      fontSize: 15,
      fontFamily: 'Inter_400Regular',
    },
    tapHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      justifyContent: 'center',
    },
    tapHintText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
    },
    bracket: {
      alignItems: 'center',
      paddingVertical: 6,
      marginBottom: 4,
    },
    waitCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 20,
      alignItems: 'center',
      gap: 10,
      marginTop: 12,
    },
    waitText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      textAlign: 'center',
      lineHeight: 20,
    },
  });
}
