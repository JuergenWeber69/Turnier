import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Match, Player, Standing, Tournament, TournamentMode } from '@/types';
import {
  allGroupMatchesDone,
  calculateStandings,
  createTournament,
  currentRRRoundDone,
  currentSwissRoundDone,
  generateFinalMatches,
  generateKOMatches,
  generateNextSwissRound,
  generateQFMatches,
  generateSFMatchesFromQF,
  getThirdPlaceId,
  getWinnerId,
  isSwissFinished,
  isThreeGroupTournament,
  isTwoGroupTournament,
} from '@/utils/tournament';

const STORAGE_KEY = '@tischtennis_v2';

interface TournamentContextType {
  tournament: Tournament | null;
  loading: boolean;
  startTournament: (players: Player[], mode: TournamentMode, name: string) => void;
  updateMatch: (matchId: string, score1: number, score2: number) => void;
  updatePlayer: (playerId: string, name: string, ttr: number) => void;
  startKOPhase: () => void;
  advanceSwissRound: () => void;
  advanceRRRound: () => void;
  resetTournament: () => void;
  getGroupStandings: (group: 'A' | 'B' | 'C' | 'none') => Standing[];
  isGroupDone: boolean;
  isSwissDone: boolean;
  swissRoundDone: boolean;
  rrRoundDone: boolean;
  isTwoGroup: boolean;
  isThreeGroup: boolean;
  winner: string | undefined;
  thirdPlace: string | undefined;
}

const TournamentContext = createContext<TournamentContextType | null>(null);

export function TournamentProvider({ children }: { children: React.ReactNode }) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(data => {
        if (data) {
          const t = JSON.parse(data) as Tournament;
          if (!t.groupCPlayerIds) t.groupCPlayerIds = [];
          setTournament(t);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback((t: Tournament | null) => {
    if (t) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(t));
    else AsyncStorage.removeItem(STORAGE_KEY);
    setTournament(t);
  }, []);

  const startTournament = useCallback((players: Player[], mode: TournamentMode, name: string) => {
    persist(createTournament(players, mode, name));
  }, [persist]);

  const updateMatch = useCallback((matchId: string, score1: number, score2: number) => {
    setTournament(prev => {
      if (!prev) return prev;
      const matches = prev.matches.map((m: Match) =>
        m.id === matchId ? { ...m, score1, score2, completed: true } : m,
      );
      let updated: Tournament = { ...prev, matches };

      // ── Simple KO: propagate winner to next round ─────────────────────────
      if (updated.mode === 'simpleko') {
        const completedMatch = updated.matches.find(m => m.id === matchId);
        if (completedMatch && completedMatch.phase === 'group') {
          const winner = score1 > score2 ? completedMatch.player1Id : completedMatch.player2Id;
          const round = completedMatch.round;

          // Find this match's position within its round
          const roundMatches = updated.matches.filter(
            m => m.phase === 'group' && m.round === round,
          );
          const pos = roundMatches.findIndex(m => m.id === matchId);

          // Update next round's match (if not the final)
          if (round < updated.totalRounds) {
            const nextRoundMatches = updated.matches.filter(
              m => m.phase === 'group' && m.round === round + 1,
            );
            const nextMatchPos = Math.floor(pos / 2);
            const isPlayer1Slot = pos % 2 === 0;
            const nextMatch = nextRoundMatches[nextMatchPos];
            if (nextMatch) {
              const field = isPlayer1Slot ? 'player1Id' : 'player2Id';
              updated = {
                ...updated,
                matches: updated.matches.map(m =>
                  m.id === nextMatch.id ? { ...m, [field]: winner } : m,
                ),
              };
            }
          }

          // Final round complete → tournament finished
          if (round >= updated.totalRounds) {
            updated = { ...updated, phase: 'finished', winnerId: winner };
          }
        }
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }

      // ── 3-group: QF done → generate SF ───────────────────────────────────
      const qf1 = updated.matches.find(m => m.phase === 'qf1');
      const qf2 = updated.matches.find(m => m.phase === 'qf2');
      const qf3 = updated.matches.find(m => m.phase === 'qf3');
      const qf4 = updated.matches.find(m => m.phase === 'qf4');
      const hasSemi = updated.matches.some(m => m.phase === 'semi1');
      if (qf1?.completed && qf2?.completed && qf3?.completed && qf4?.completed && !hasSemi) {
        updated = { ...updated, matches: [...updated.matches, ...generateSFMatchesFromQF(qf1, qf2, qf3, qf4)] };
      }

      // ── SF done → generate Final + 3rd ────────────────────────────────────
      const semi1 = updated.matches.find(m => m.phase === 'semi1');
      const semi2 = updated.matches.find(m => m.phase === 'semi2');
      const hasFinal = updated.matches.some(m => m.phase === 'final');
      if (semi1?.completed && semi2?.completed && !hasFinal) {
        updated = { ...updated, matches: [...updated.matches, ...generateFinalMatches(semi1, semi2)] };
      }

      // ── Final done → tournament finished ──────────────────────────────────
      const finalMatch = updated.matches.find(m => m.phase === 'final');
      if (finalMatch?.completed) {
        updated = { ...updated, phase: 'finished', winnerId: getWinnerId(updated), thirdPlaceId: getThirdPlaceId(updated) };
      }

      // ── Swiss done ─────────────────────────────────────────────────────────
      if (updated.mode === 'swiss' && isSwissFinished(updated)) {
        const st = calculateStandings(updated.players.map(p => p.id), updated.matches, 'none');
        updated = { ...updated, phase: 'finished', winnerId: st[0]?.playerId };
      }

      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const startKOPhase = useCallback(() => {
    setTournament(prev => {
      if (!prev) return prev;
      const threeGroup = isThreeGroupTournament(prev);
      let koMatches: Match[];
      if (threeGroup) {
        const groupC = prev.groupCPlayerIds ?? [];
        const standingsA = calculateStandings(prev.groupAPlayerIds, prev.matches, 'A');
        const standingsB = calculateStandings(prev.groupBPlayerIds, prev.matches, 'B');
        const standingsC = calculateStandings(groupC, prev.matches, 'C');
        koMatches = generateQFMatches(standingsA, standingsB, standingsC);
      } else {
        const standingsA = calculateStandings(prev.groupAPlayerIds, prev.matches, 'A');
        const standingsB = calculateStandings(prev.groupBPlayerIds, prev.matches, 'B');
        koMatches = generateKOMatches(standingsA, standingsB);
      }
      const updated: Tournament = { ...prev, phase: 'knockout', matches: [...prev.matches, ...koMatches] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const advanceSwissRound = useCallback(() => {
    setTournament(prev => {
      if (!prev) return prev;
      const nextMatches = generateNextSwissRound(prev);
      const updated: Tournament = { ...prev, currentRound: prev.currentRound + 1, matches: [...prev.matches, ...nextMatches] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const advanceRRRound = useCallback(() => {
    setTournament(prev => {
      if (!prev) return prev;
      const updated: Tournament = { ...prev, currentRound: prev.currentRound + 1 };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updatePlayer = useCallback((playerId: string, name: string, ttr: number) => {
    setTournament(prev => {
      if (!prev) return prev;
      const updated: Tournament = {
        ...prev,
        players: prev.players.map(p => p.id === playerId ? { ...p, name: name.trim(), ttr } : p),
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetTournament = useCallback(() => persist(null), [persist]);

  const getGroupStandings = useCallback((group: 'A' | 'B' | 'C' | 'none'): Standing[] => {
    if (!tournament) return [];
    if (group === 'none') {
      return calculateStandings(tournament.players.map(p => p.id), tournament.matches, 'none');
    }
    const playerIds =
      group === 'A' ? tournament.groupAPlayerIds
      : group === 'B' ? tournament.groupBPlayerIds
      : (tournament.groupCPlayerIds ?? []);
    return calculateStandings(playerIds, tournament.matches, group);
  }, [tournament]);

  const isGroupDone = tournament ? allGroupMatchesDone(tournament) : false;
  const isSwissDone = tournament?.mode === 'swiss' ? isSwissFinished(tournament) : false;
  const swissRoundDone = tournament?.mode === 'swiss' ? currentSwissRoundDone(tournament) : false;
  const rrRoundDone = tournament?.mode === 'roundrobin' ? currentRRRoundDone(tournament) : false;
  const isTwoGroup = tournament ? isTwoGroupTournament(tournament) : false;
  const isThreeGroup = tournament ? isThreeGroupTournament(tournament) : false;
  const winner = tournament ? (tournament.winnerId ?? getWinnerId(tournament)) : undefined;
  const thirdPlace = tournament ? (tournament.thirdPlaceId ?? getThirdPlaceId(tournament)) : undefined;

  return (
    <TournamentContext.Provider value={{
      tournament, loading,
      startTournament, updateMatch, updatePlayer,
      startKOPhase, advanceSwissRound, advanceRRRound, resetTournament,
      getGroupStandings,
      isGroupDone, isSwissDone, swissRoundDone, rrRoundDone,
      isTwoGroup, isThreeGroup, winner, thirdPlace,
    }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament(): TournamentContextType {
  const ctx = useContext(TournamentContext);
  if (!ctx) throw new Error('useTournament must be used within TournamentProvider');
  return ctx;
}
