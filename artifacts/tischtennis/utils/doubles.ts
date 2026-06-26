import { Player } from '@/types';
import { DoublePair, DoublesMatch, DoublesTournament, DoublesStandingEntry } from '@/types/doubles';

export const DOUBLES_MIN_PLAYERS = 7;

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draws doubles pairs from a player list.
 * Sort by TTR desc, shuffle upper/lower halves, pair 1:1.
 * Odd player count: middle player becomes 3rd member of a random pair (triple).
 */
export function drawDoublesPairs(players: Player[]): DoublePair[] {
  const sorted = [...players].sort((a, b) => b.ttr - a.ttr);
  const n = sorted.length;

  let upperPlayers: Player[];
  let lowerPlayers: Player[];
  let extraPlayer: Player | null = null;

  if (n % 2 === 0) {
    upperPlayers = sorted.slice(0, n / 2);
    lowerPlayers = sorted.slice(n / 2);
  } else {
    const half = Math.floor(n / 2);
    upperPlayers = sorted.slice(0, half);
    lowerPlayers = sorted.slice(half + 1);
    extraPlayer = sorted[half];
  }

  const shuffledUpper = shuffle(upperPlayers);
  const shuffledLower = shuffle(lowerPlayers);

  const pairs: DoublePair[] = shuffledUpper.map((upper, i) => {
    const lower = shuffledLower[i];
    return {
      id: genId(),
      playerIds: [upper.id, lower.id],
      displayName: `${upper.name} / ${lower.name}`,
    };
  });

  if (extraPlayer) {
    const extra = extraPlayer;
    const tripleIdx = Math.floor(Math.random() * pairs.length);
    const target = pairs[tripleIdx];
    const names = target.playerIds.map(pid => players.find(p => p.id === pid)!.name);
    pairs[tripleIdx] = {
      ...target,
      playerIds: [...target.playerIds, extra.id],
      displayName: `${names.join(' / ')} / ${extra.name}`,
    };
  }

  return pairs;
}

/**
 * Generates round-robin doubles matches using the circle method.
 * For k pairs (even): k-1 rounds, each with k/2 matches.
 * For k pairs (odd):  k rounds, one pair sits out per round (no BYE match generated).
 * Triple pairs rotate which player sits out cyclically.
 */
export function generateDoublesMatches(pairs: DoublePair[]): DoublesMatch[] {
  const k = pairs.length;
  if (k < 2) return [];

  const isOdd = k % 2 === 1;
  const pairIds = pairs.map(p => p.id);
  const teams = isOdd ? [...pairIds, 'BYE'] : [...pairIds];
  const N = teams.length;
  const numRounds = N - 1;
  const matches: DoublesMatch[] = [];

  const tripleCount = new Map<string, number>();
  pairs.forEach(p => { if (p.playerIds.length === 3) tripleCount.set(p.id, 0); });

  const fixed = teams[0];
  const rotating = teams.slice(1);

  for (let r = 0; r < numRounds; r++) {
    const roundNum = r + 1;
    const rotLen = rotating.length;
    const rotated = rotLen > 0
      ? [...rotating.slice(r % rotLen), ...rotating.slice(0, r % rotLen)]
      : [];
    const current = [fixed, ...rotated];

    for (let i = 0; i < N / 2; i++) {
      const p1id = current[i];
      const p2id = current[N - 1 - i];
      if (p1id === 'BYE' || p2id === 'BYE') continue;

      const c1 = tripleCount.get(p1id);
      const c2 = tripleCount.get(p2id);
      const tripleActive1 = c1 !== undefined ? c1 % 3 : null;
      const tripleActive2 = c2 !== undefined ? c2 % 3 : null;
      if (c1 !== undefined) tripleCount.set(p1id, c1 + 1);
      if (c2 !== undefined) tripleCount.set(p2id, c2 + 1);

      matches.push({
        id: genId(),
        pair1Id: p1id,
        pair2Id: p2id,
        tripleActive1,
        tripleActive2,
        score1: null,
        score2: null,
        completed: false,
        round: roundNum,
      });
    }
  }

  return matches;
}

export function createDoublesTournament(players: Player[], name: string): DoublesTournament {
  const pairs = drawDoublesPairs(players);
  const matches = generateDoublesMatches(pairs);
  const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
  return {
    id: genId(),
    name: name.trim() || 'Doppelturnier',
    players,
    pairs,
    matches,
    currentRound: 1,
    totalRounds,
    createdAt: Date.now(),
  };
}

export function currentDoublesRoundDone(tournament: DoublesTournament): boolean {
  const cur = tournament.matches.filter(m => m.round === tournament.currentRound);
  return cur.length > 0 && cur.every(m => m.completed);
}

export function calculateDoublesStandings(tournament: DoublesTournament): DoublesStandingEntry[] {
  const stats = new Map<string, { wins: number; losses: number; setsWon: number; setsLost: number; points: number }>();
  tournament.pairs.forEach(p => stats.set(p.id, { wins: 0, losses: 0, setsWon: 0, setsLost: 0, points: 0 }));

  for (const m of tournament.matches) {
    if (!m.completed || m.score1 === null || m.score2 === null) continue;
    const s1 = stats.get(m.pair1Id);
    const s2 = stats.get(m.pair2Id);
    if (!s1 || !s2) continue;
    s1.setsWon += m.score1;
    s1.setsLost += m.score2;
    s2.setsWon += m.score2;
    s2.setsLost += m.score1;
    if (m.score1 > m.score2) {
      s1.wins++; s1.points += 2; s2.losses++;
    } else if (m.score2 > m.score1) {
      s2.wins++; s2.points += 2; s1.losses++;
    }
  }

  return tournament.pairs
    .map(p => ({ pair: p, ...stats.get(p.id)!, rank: 0 }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const aDiff = a.setsWon - a.setsLost;
      const bDiff = b.setsWon - b.setsLost;
      if (bDiff !== aDiff) return bDiff - aDiff;
      return b.setsWon - a.setsWon;
    })
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export function getMatchPlayerNames(
  pair: DoublePair,
  activeIndex: number | null,
  players: Player[],
): { line1: string; line2: string | null } {
  const pNames = pair.playerIds.map(id => players.find(p => p.id === id)?.name ?? '?');
  if (activeIndex === null || pair.playerIds.length < 3) {
    return { line1: pNames.join(' / '), line2: null };
  }
  const playingNames = pNames.filter((_, i) => i !== activeIndex);
  return { line1: playingNames.join(' / '), line2: `(${pNames[activeIndex]} pausiert)` };
}
