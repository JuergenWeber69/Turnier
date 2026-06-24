import { Match, MatchGroup, MatchPhase, Player, Standing, Tournament, TournamentMode } from '@/types';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ── ROUND ROBIN (Circle Method) ──────────────────────────────────────────────

function generateRoundRobinMatchesWithRounds(playerIds: string[], group: MatchGroup): Match[] {
  const n = playerIds.length;
  const isOdd = n % 2 === 1;
  const teams = isOdd ? [...playerIds, 'BYE'] : [...playerIds];
  const N = teams.length;
  const numRounds = N - 1;
  const matches: Match[] = [];

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
      const p1 = current[i];
      const p2 = current[N - 1 - i];

      if (p1 === 'BYE' || p2 === 'BYE') {
        const real = p1 === 'BYE' ? p2 : p1;
        matches.push({
          id: genId(), player1Id: real, player2Id: 'BYE',
          score1: 3, score2: 0, completed: true,
          group, phase: 'group', round: roundNum,
        });
      } else {
        matches.push({
          id: genId(), player1Id: p1, player2Id: p2,
          score1: null, score2: null, completed: false,
          group, phase: 'group', round: roundNum,
        });
      }
    }
  }
  return matches;
}

/** Snake-draft seeding for 2 groups by TTR. */
export function seedGroupsByTTR(players: Player[]): { A: string[]; B: string[] } {
  const sorted = [...players].sort((a, b) => b.ttr - a.ttr);
  const A: string[] = [];
  const B: string[] = [];
  sorted.forEach((p, i) => {
    const pos = i % 4;
    if (pos === 0 || pos === 3) A.push(p.id);
    else B.push(p.id);
  });
  return { A, B };
}

/** Snake-draft seeding for 3 groups by TTR. */
export function seedThreeGroupsByTTR(players: Player[]): { A: string[]; B: string[]; C: string[] } {
  const sorted = [...players].sort((a, b) => b.ttr - a.ttr);
  const A: string[] = [];
  const B: string[] = [];
  const C: string[] = [];
  sorted.forEach((p, i) => {
    const pos = i % 6;
    if (pos === 0 || pos === 5) A.push(p.id);
    else if (pos === 1 || pos === 4) B.push(p.id);
    else C.push(p.id);
  });
  return { A, B, C };
}

// ── SWISS SYSTEM ─────────────────────────────────────────────────────────────

export const SWISS_MIN_PLAYERS = 8;
export const SWISS_TOTAL_ROUNDS = 6;

export function getSwissTotalRounds(_n: number): number {
  return SWISS_TOTAL_ROUNDS;
}

function swissFirstRound(players: Player[]): Match[] {
  const sorted = [...players].sort((a, b) => b.ttr - a.ttr);
  const matches: Match[] = [];

  let playersForPairing = sorted;
  if (sorted.length % 2 === 1) {
    const byePlayer = sorted[sorted.length - 1];
    matches.push({
      id: genId(), player1Id: byePlayer.id, player2Id: 'BYE',
      score1: 3, score2: 0, completed: true,
      group: 'none', phase: 'group', round: 1,
    });
    playersForPairing = sorted.slice(0, sorted.length - 1);
  }

  const half = playersForPairing.length / 2;
  const upper = playersForPairing.slice(0, half);
  const lower = playersForPairing.slice(half);
  for (let i = 0; i < upper.length; i++) {
    matches.push({
      id: genId(), player1Id: upper[i].id, player2Id: lower[i].id,
      score1: null, score2: null, completed: false,
      group: 'none', phase: 'group', round: 1,
    });
  }
  return matches;
}

export function generateNextSwissRound(tournament: Tournament): Match[] {
  const nextRound = tournament.currentRound + 1;
  const standings = calculateStandings(tournament.players.map(p => p.id), tournament.matches, 'none');

  const sorted = standings.sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    const pA = tournament.players.find(p => p.id === a.playerId);
    const pB = tournament.players.find(p => p.id === b.playerId);
    return (pB?.ttr ?? 0) - (pA?.ttr ?? 0);
  });

  const played = new Set<string>();
  for (const m of tournament.matches) {
    if (m.player1Id !== 'BYE' && m.player2Id !== 'BYE') {
      played.add(`${m.player1Id}|${m.player2Id}`);
      played.add(`${m.player2Id}|${m.player1Id}`);
    }
  }

  const remaining = sorted.map(s => s.playerId);
  const matches: Match[] = [];
  while (remaining.length >= 2) {
    const p1 = remaining.shift()!;
    let bestIdx = -1;
    for (let i = 0; i < remaining.length; i++) {
      if (!played.has(`${p1}|${remaining[i]}`)) { bestIdx = i; break; }
    }
    if (bestIdx === -1) bestIdx = 0;
    const p2 = remaining.splice(bestIdx, 1)[0];
    matches.push({
      id: genId(), player1Id: p1, player2Id: p2,
      score1: null, score2: null, completed: false,
      group: 'none', phase: 'group', round: nextRound,
    });
  }
  if (remaining.length === 1) {
    matches.push({
      id: genId(), player1Id: remaining[0], player2Id: 'BYE',
      score1: 3, score2: 0, completed: true,
      group: 'none', phase: 'group', round: nextRound,
    });
  }
  return matches;
}

// ── SIMPLE KO ─────────────────────────────────────────────────────────────────

export const SIMPLEKO_MAX_PLAYERS = 24;

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function getSimpleKOTotalRounds(n: number): number {
  return Math.ceil(Math.log2(Math.max(n, 2)));
}

/**
 * Standard single-elimination bracket seeding.
 * Returns an array of seed numbers for each bracket position.
 * Seed 1 and 2 end up on opposite sides → they meet in the final.
 */
function generateBracketSeeds(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const newSize = seeds.length * 2;
    seeds = seeds.flatMap(s => [s, newSize + 1 - s]);
  }
  return seeds;
}

/**
 * Generates the full Simple KO bracket upfront.
 * - Top seeds get BYEs first (user requirement).
 * - Future rounds pre-populated with 'TBD' until winners are known.
 * - BYE matches auto-completed immediately.
 */
export function generateSimpleKOBracket(players: Player[]): Match[] {
  const sorted = [...players].sort((a, b) => b.ttr - a.ttr);
  const n = sorted.length;
  const bracketSize = nextPow2(n);
  const totalRounds = Math.log2(bracketSize); // exact integer

  // Map bracket positions to player IDs (or BYE)
  const seedOrder = generateBracketSeeds(bracketSize);
  const positions: string[] = seedOrder.map(seed =>
    seed <= n ? sorted[seed - 1].id : 'BYE',
  );

  // Round 1: pairs of adjacent positions
  const round1: Match[] = [];
  for (let i = 0; i < bracketSize; i += 2) {
    const p1 = positions[i];
    const p2 = positions[i + 1];
    if (p1 === 'BYE' || p2 === 'BYE') {
      const real = p1 === 'BYE' ? p2 : p1;
      round1.push({
        id: genId(), player1Id: real, player2Id: 'BYE',
        score1: 3, score2: 0, completed: true,
        group: 'none', phase: 'group', round: 1,
      });
    } else {
      round1.push({
        id: genId(), player1Id: p1, player2Id: p2,
        score1: null, score2: null, completed: false,
        group: 'none', phase: 'group', round: 1,
      });
    }
  }

  const allMatches: Match[] = [...round1];

  // Subsequent rounds: fill in winners from already-completed (BYE) matches, else TBD
  let prevRound: Match[] = round1;
  for (let r = 2; r <= totalRounds; r++) {
    const numMatches = prevRound.length / 2;
    const thisRound: Match[] = [];
    for (let i = 0; i < numMatches; i++) {
      const prevA = prevRound[2 * i];
      const prevB = prevRound[2 * i + 1];
      const p1 = prevA.completed
        ? ((prevA.score1 ?? 0) > (prevA.score2 ?? 0) ? prevA.player1Id : prevA.player2Id)
        : 'TBD';
      const p2 = prevB.completed
        ? ((prevB.score1 ?? 0) > (prevB.score2 ?? 0) ? prevB.player1Id : prevB.player2Id)
        : 'TBD';

      thisRound.push({
        id: genId(), player1Id: p1, player2Id: p2,
        score1: null, score2: null, completed: false,
        group: 'none', phase: 'group', round: r,
      });
    }
    allMatches.push(...thisRound);
    prevRound = thisRound;
  }

  return allMatches;
}

/** Returns the German round label for Simple KO display. */
export function getKORoundName(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  switch (fromEnd) {
    case 0: return 'Finale';
    case 1: return 'Halbfinale';
    case 2: return 'Viertelfinale';
    case 3: return 'Achtelfinale';
    default: return 'Beste 32';
  }
}

// ── STANDINGS ─────────────────────────────────────────────────────────────────

export function calculateStandings(
  playerIds: string[],
  matches: Match[],
  group: MatchGroup,
): Standing[] {
  const map = new Map<string, Standing>();
  for (const pid of playerIds) {
    map.set(pid, { playerId: pid, wins: 0, losses: 0, byes: 0, setsWon: 0, setsLost: 0, matchPoints: 0, rank: 0 });
  }

  for (const m of matches) {
    if (!m.completed || m.score1 === null || m.score2 === null) continue;
    if (group !== 'none' && m.group !== group) continue;
    if (group === 'none' && m.phase !== 'group') continue;

    if (m.player1Id === 'BYE' || m.player2Id === 'BYE') {
      const realId = m.player1Id === 'BYE' ? m.player2Id : m.player1Id;
      const winScore = m.player1Id === 'BYE' ? m.score2 : m.score1;
      const s = map.get(realId);
      if (s) { s.wins++; s.byes++; s.matchPoints += 2; s.setsWon += winScore ?? 3; }
      continue;
    }

    const s1 = map.get(m.player1Id);
    const s2 = map.get(m.player2Id);
    if (!s1 || !s2) continue;

    s1.setsWon += m.score1;  s1.setsLost += m.score2;
    s2.setsWon += m.score2;  s2.setsLost += m.score1;

    if (m.score1 > m.score2) {
      s1.wins++; s1.matchPoints += 2; s2.losses++;
    } else if (m.score2 > m.score1) {
      s2.wins++; s2.matchPoints += 2; s1.losses++;
    } else {
      s1.matchPoints += 1; s2.matchPoints += 1;
    }
  }

  const sorted = Array.from(map.values()).sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    const aDiff = a.setsWon - a.setsLost;
    const bDiff = b.setsWon - b.setsLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    return b.setsWon - a.setsWon;
  });
  sorted.forEach((s, i) => { s.rank = i + 1; });
  return sorted;
}

// ── TOURNAMENT CREATION ───────────────────────────────────────────────────────

export function createTournament(players: Player[], mode: TournamentMode, name: string): Tournament {
  const n = players.length;
  let matches: Match[] = [];
  let groupAPlayerIds: string[] = [];
  let groupBPlayerIds: string[] = [];
  let groupCPlayerIds: string[] = [];
  let currentRound = 0;
  let totalRounds = 0;
  let startPhase: Tournament['phase'] = 'group';

  if (mode === 'swiss') {
    totalRounds = getSwissTotalRounds(n);
    currentRound = 1;
    matches = swissFirstRound(players);
  } else if (mode === 'simpleko') {
    // Simple KO: full bracket generated upfront, starts in knockout phase
    totalRounds = getSimpleKOTotalRounds(n);
    currentRound = 1;
    matches = generateSimpleKOBracket(players);
    startPhase = 'knockout';
  } else {
    // roundrobin
    currentRound = 1;
    if (n <= 8) {
      matches = generateRoundRobinMatchesWithRounds(players.map(p => p.id), 'none');
      totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0;
    } else if (n <= 16) {
      const { A, B } = seedGroupsByTTR(players);
      groupAPlayerIds = A;
      groupBPlayerIds = B;
      const mA = generateRoundRobinMatchesWithRounds(A, 'A');
      const mB = generateRoundRobinMatchesWithRounds(B, 'B');
      matches = [...mA, ...mB];
      totalRounds = Math.max(
        mA.length > 0 ? Math.max(...mA.map(m => m.round)) : 0,
        mB.length > 0 ? Math.max(...mB.map(m => m.round)) : 0,
      );
    } else {
      // 3 groups (17–24 players)
      const { A, B, C } = seedThreeGroupsByTTR(players);
      groupAPlayerIds = A; groupBPlayerIds = B; groupCPlayerIds = C;
      const mA = generateRoundRobinMatchesWithRounds(A, 'A');
      const mB = generateRoundRobinMatchesWithRounds(B, 'B');
      const mC = generateRoundRobinMatchesWithRounds(C, 'C');
      matches = [...mA, ...mB, ...mC];
      totalRounds = Math.max(
        mA.length > 0 ? Math.max(...mA.map(m => m.round)) : 0,
        mB.length > 0 ? Math.max(...mB.map(m => m.round)) : 0,
        mC.length > 0 ? Math.max(...mC.map(m => m.round)) : 0,
      );
    }
  }

  return {
    id: genId(),
    name: name.trim() || 'Turnier',
    mode,
    players,
    matches,
    phase: startPhase,
    groupAPlayerIds,
    groupBPlayerIds,
    groupCPlayerIds,
    currentRound,
    totalRounds,
    createdAt: Date.now(),
  };
}

// ── ROUND HELPERS ─────────────────────────────────────────────────────────────

export function currentRRRoundDone(tournament: Tournament): boolean {
  if (tournament.mode !== 'roundrobin') return false;
  const cur = tournament.matches.filter(m => m.phase === 'group' && m.round === tournament.currentRound);
  return cur.length > 0 && cur.every(m => m.completed);
}

export function currentSwissRoundDone(tournament: Tournament): boolean {
  const cur = tournament.matches.filter(m => m.round === tournament.currentRound);
  return cur.length > 0 && cur.every(m => m.completed);
}

export function isSwissFinished(tournament: Tournament): boolean {
  return tournament.currentRound >= tournament.totalRounds && currentSwissRoundDone(tournament);
}

export function allGroupMatchesDone(tournament: Tournament): boolean {
  return tournament.matches.filter(m => m.phase === 'group').every(m => m.completed);
}

// ── KO PHASE (group-based tournaments) ───────────────────────────────────────

export function generateKOMatches(standingsA: Standing[], standingsB: Standing[]): Match[] {
  return [
    { id: 'semi1', player1Id: standingsA[0].playerId, player2Id: standingsB[1].playerId, score1: null, score2: null, completed: false, group: 'none', phase: 'semi1', round: 0 },
    { id: 'semi2', player1Id: standingsB[0].playerId, player2Id: standingsA[1].playerId, score1: null, score2: null, completed: false, group: 'none', phase: 'semi2', round: 0 },
  ];
}

export function generateQFMatches(
  standingsA: Standing[],
  standingsB: Standing[],
  standingsC: Standing[],
): Match[] {
  const rank = (s: Standing) =>
    s.matchPoints * 10000 + (s.setsWon - s.setsLost) * 100 + s.setsWon;

  const winners = [standingsA[0], standingsB[0], standingsC[0]]
    .filter(Boolean).sort((a, b) => rank(b) - rank(a));
  const runners = [standingsA[1], standingsB[1], standingsC[1]]
    .filter(Boolean).sort((a, b) => rank(b) - rank(a));
  const thirds = [standingsA[2], standingsB[2], standingsC[2]]
    .filter(Boolean).sort((a, b) => rank(b) - rank(a)).slice(0, 2);

  const seeds = [...winners, ...runners, ...thirds];
  const mk = (phase: MatchPhase, a: Standing, b: Standing): Match => ({
    id: phase, player1Id: a.playerId, player2Id: b.playerId,
    score1: null, score2: null, completed: false,
    group: 'none', phase, round: 0,
  });
  return [
    mk('qf1', seeds[0], seeds[7]),
    mk('qf2', seeds[1], seeds[6]),
    mk('qf3', seeds[2], seeds[5]),
    mk('qf4', seeds[3], seeds[4]),
  ];
}

export function generateSFMatchesFromQF(qf1: Match, qf2: Match, qf3: Match, qf4: Match): Match[] {
  const w = (m: Match) => ((m.score1 ?? 0) > (m.score2 ?? 0) ? m.player1Id : m.player2Id);
  return [
    { id: 'semi1', player1Id: w(qf1), player2Id: w(qf4), score1: null, score2: null, completed: false, group: 'none', phase: 'semi1', round: 0 },
    { id: 'semi2', player1Id: w(qf2), player2Id: w(qf3), score1: null, score2: null, completed: false, group: 'none', phase: 'semi2', round: 0 },
  ];
}

export function generateFinalMatches(semi1: Match, semi2: Match): Match[] {
  const winner1 = semi1.score1! > semi1.score2! ? semi1.player1Id : semi1.player2Id;
  const loser1  = semi1.score1! > semi1.score2! ? semi1.player2Id : semi1.player1Id;
  const winner2 = semi2.score1! > semi2.score2! ? semi2.player1Id : semi2.player2Id;
  const loser2  = semi2.score1! > semi2.score2! ? semi2.player2Id : semi2.player1Id;
  return [
    { id: 'third', player1Id: loser1,  player2Id: loser2,  score1: null, score2: null, completed: false, group: 'none', phase: 'third', round: 0 },
    { id: 'final', player1Id: winner1, player2Id: winner2, score1: null, score2: null, completed: false, group: 'none', phase: 'final', round: 0 },
  ];
}

export function getWinnerId(tournament: Tournament): string | undefined {
  if (tournament.mode === 'simpleko') {
    const finalRound = tournament.matches.filter(
      m => m.phase === 'group' && m.round === tournament.totalRounds && m.completed,
    );
    const fm = finalRound[0];
    if (!fm || fm.score1 === null || fm.score2 === null) return undefined;
    return fm.score1 > fm.score2 ? fm.player1Id : fm.player2Id;
  }
  const f = tournament.matches.find(m => m.phase === 'final');
  if (!f?.completed || f.score1 === null || f.score2 === null) return undefined;
  return f.score1 > f.score2 ? f.player1Id : f.player2Id;
}

export function getThirdPlaceId(tournament: Tournament): string | undefined {
  const f = tournament.matches.find(m => m.phase === 'third');
  if (!f?.completed || f.score1 === null || f.score2 === null) return undefined;
  return f.score1 > f.score2 ? f.player1Id : f.player2Id;
}

// ── MISC HELPERS ──────────────────────────────────────────────────────────────

export function isTwoGroupTournament(tournament: Tournament): boolean {
  return tournament.groupAPlayerIds.length > 0 && (tournament.groupCPlayerIds ?? []).length === 0;
}

export function isThreeGroupTournament(tournament: Tournament): boolean {
  return (tournament.groupCPlayerIds ?? []).length > 0;
}

export function getPlayerName(tournament: Tournament, id: string): string {
  if (id === 'BYE') return 'Freilos';
  if (id === 'TBD') return '?';
  return tournament.players.find(p => p.id === id)?.name ?? '???';
}

export function getPlayerTTR(tournament: Tournament, id: string): number {
  return tournament.players.find(p => p.id === id)?.ttr ?? 0;
}
