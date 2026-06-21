import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Standing, Tournament } from '@/types';
import { getPlayerName } from '@/utils/tournament';

interface StandingsTableProps {
  standings: Standing[];
  tournament: Tournament;
  title?: string;
}

export function StandingsTable({ standings, tournament, title }: StandingsTableProps) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.header}>
        <Text style={[styles.headerCell, styles.rankCell]}>#</Text>
        <Text style={[styles.headerCell, styles.nameCell]}>Spieler</Text>
        <Text style={[styles.headerCell, styles.numCell]}>S</Text>
        <Text style={[styles.headerCell, styles.numCell]}>N</Text>
        <Text style={[styles.headerCell, styles.satzCell]}>Sätze</Text>
        <Text style={[styles.headerCell, styles.pktCell]}>Pkt</Text>
      </View>
      {standings.map((s, i) => {
        const name = getPlayerName(tournament, s.playerId);
        const isTop2 = s.rank <= 2;
        return (
          <View
            key={s.playerId}
            style={[styles.row, i % 2 === 0 && styles.rowAlt, isTop2 && styles.rowTop]}>
            <View style={[styles.rankBadge, { backgroundColor: getRankColor(s.rank, colors) }]}>
              <Text style={styles.rankText}>{s.rank}</Text>
            </View>
            <Text style={[styles.cell, styles.nameCell, isTop2 && styles.topName]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[styles.cell, styles.numCell, { color: colors.success }]}>{s.wins}</Text>
            <Text style={[styles.cell, styles.numCell, { color: colors.destructive }]}>{s.losses}</Text>
            <Text style={[styles.cell, styles.satzCell]}>{s.setsWon}:{s.setsLost}</Text>
            <Text style={[styles.cell, styles.pktCell, styles.pointsCell]}>{s.matchPoints}</Text>
          </View>
        );
      })}

      <View style={styles.legend}>
        <Text style={styles.legendText}>S = Siege  ·  N = Niederlagen  ·  Pkt = Punkte (2 pro Sieg)</Text>
      </View>
    </View>
  );
}

function getRankColor(rank: number, colors: ReturnType<typeof useColors>): string {
  if (rank === 1) return '#f59e0b';
  if (rank === 2) return colors.mutedForeground;
  if (rank === 3) return '#b45309';
  return 'transparent';
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 16,
    },
    groupTitle: {
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
      color: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.secondary,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.secondary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCell: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 44,
    },
    rowAlt: {
      backgroundColor: colors.background,
    },
    rowTop: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    rankBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    rankCell: {
      width: 32,
    },
    rankText: {
      fontSize: 12,
      fontFamily: 'Inter_700Bold',
      color: '#ffffff',
    },
    cell: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
    },
    nameCell: {
      flex: 1,
      fontFamily: 'Inter_500Medium',
    },
    topName: {
      fontFamily: 'Inter_700Bold',
      color: colors.foreground,
    },
    numCell: {
      width: 36,
      textAlign: 'center',
    },
    satzCell: {
      width: 52,
      textAlign: 'center',
    },
    pktCell: {
      width: 38,
      textAlign: 'center',
    },
    pointsCell: {
      fontFamily: 'Inter_700Bold',
      color: colors.primary,
    },
    legend: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.secondary,
    },
    legendText: {
      fontSize: 10,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
  });
}
