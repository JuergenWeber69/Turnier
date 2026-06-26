import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Match, Tournament } from '@/types';
import { getPlayerName, getPlayerTTR } from '@/utils/tournament';

interface MatchCardProps {
  match: Match;
  tournament: Tournament;
  onPress: (match: Match) => void;
}

export function MatchCard({ match, tournament, onPress }: MatchCardProps) {
  const colors = useColors();
  const isBye = match.player2Id === 'BYE' || match.player1Id === 'BYE';
  const p1Name = getPlayerName(tournament, match.player1Id);
  const p2Name = getPlayerName(tournament, match.player2Id);

  const winner1 = match.completed && match.score1 !== null && match.score2 !== null && match.score1 > match.score2;
  const winner2 = match.completed && match.score1 !== null && match.score2 !== null && match.score2 > match.score1;

  const styles = makeStyles(colors);

  if (isBye) {
    const realPlayerId = match.player1Id === 'BYE' ? match.player2Id : match.player1Id;
    const realName = getPlayerName(tournament, realPlayerId);
    return (
      <View style={[styles.card, styles.cardBye]}>
        <View style={[styles.accentBar, { backgroundColor: colors.mutedForeground, opacity: 0.3 }]} />
        <View style={styles.row}>
          <Text style={[styles.playerName, { color: colors.mutedForeground, flex: 1 }]}>{realName}</Text>
          <View style={styles.scoreBox}>
            <Text style={[styles.scoreText, { color: colors.mutedForeground }]}>Freilos</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Ionicons name="checkmark-circle" size={18} color={colors.success} style={{ marginLeft: 8 }} />
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        match.completed ? styles.cardDone : styles.cardPending,
      ]}
      onPress={() => onPress(match)}
      activeOpacity={0.75}>
      <View style={[
        styles.accentBar,
        { backgroundColor: match.completed ? colors.success : colors.primary },
      ]} />
      <View style={styles.row}>
        <View style={styles.playerCol}>
          <Text style={[styles.playerName, winner1 && styles.winner]} numberOfLines={1}>
            {p1Name}
          </Text>
          {tournament.mode === 'swiss' && (
            <Text style={[styles.ttr, { color: colors.mutedForeground }]}>
              {getPlayerTTR(tournament, match.player1Id)}
            </Text>
          )}
        </View>

        <View style={[
          styles.scoreBox,
          match.completed && { backgroundColor: colors.secondary, borderRadius: 8, paddingVertical: 4 },
        ]}>
          {match.completed ? (
            <Text style={styles.scoreText}>{match.score1} : {match.score2}</Text>
          ) : (
            <Text style={[styles.scorePlaceholder, { color: colors.mutedForeground }]}>— : —</Text>
          )}
        </View>

        <View style={[styles.playerCol, styles.playerColRight]}>
          <Text style={[styles.playerName, styles.playerNameRight, winner2 && styles.winner]} numberOfLines={1}>
            {p2Name}
          </Text>
          {tournament.mode === 'swiss' && (
            <Text style={[styles.ttr, styles.ttrRight, { color: colors.mutedForeground }]}>
              {getPlayerTTR(tournament, match.player2Id)}
            </Text>
          )}
        </View>

        <View style={styles.editIcon}>
          {match.completed
            ? <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            : <Ionicons name="pencil" size={16} color={colors.primary} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      paddingLeft: 20,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      flexDirection: 'column',
    },
    cardPending: {
      borderColor: colors.border,
    },
    cardDone: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    cardBye: {
      borderStyle: 'dashed',
      paddingLeft: 20,
    },
    accentBar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      borderRadius: 2,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    playerCol: { flex: 1 },
    playerColRight: { alignItems: 'flex-end' },
    playerName: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    playerNameRight: { textAlign: 'right' },
    winner: {
      color: colors.primary,
      fontFamily: 'Inter_700Bold',
    },
    ttr: {
      fontSize: 11,
      fontFamily: 'Inter_400Regular',
      marginTop: 2,
    },
    ttrRight: { textAlign: 'right' },
    scoreBox: {
      paddingHorizontal: 10,
      minWidth: 70,
      alignItems: 'center',
    },
    scoreText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    scorePlaceholder: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
    },
    editIcon: {
      marginLeft: 8,
      width: 20,
      alignItems: 'center',
    },
  });
}
