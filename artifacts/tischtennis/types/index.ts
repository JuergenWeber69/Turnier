export interface Player {
  id: string;
  name: string;
  ttr: number;
}

export type TournamentMode = 'roundrobin' | 'swiss' | 'simpleko';
export type MatchPhase = 'group' | 'qf1' | 'qf2' | 'qf3' | 'qf4' | 'semi1' | 'semi2' | 'third' | 'final';
export type MatchGroup = 'A' | 'B' | 'C' | 'none';

export interface Match {
  id: string;
  player1Id: string; // 'BYE' for bye rounds
  player2Id: string; // 'BYE' for bye rounds
  score1: number | null;
  score2: number | null;
  completed: boolean;
  group: MatchGroup;
  phase: MatchPhase;
  round: number; // 0 = not round-based, ≥1 = Swiss/RR/SimpleKO round
}

export interface Standing {
  playerId: string;
  wins: number;
  losses: number;
  byes: number;
  setsWon: number;
  setsLost: number;
  matchPoints: number;
  rank: number;
}

export type TournamentPhase = 'group' | 'knockout' | 'finished';

export interface Tournament {
  id: string;
  name: string;
  mode: TournamentMode;
  players: Player[];
  matches: Match[];
  phase: TournamentPhase;
  groupAPlayerIds: string[];
  groupBPlayerIds: string[];
  groupCPlayerIds: string[];
  currentRound: number;  // Swiss/RR: current round (1-based), 0 if not started
  totalRounds: number;   // Swiss/RR/SimpleKO: total rounds; 0 for single-group RR
  createdAt: number;
  winnerId?: string;
  thirdPlaceId?: string;
}
