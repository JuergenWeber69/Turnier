import { Player } from './index';

export interface DoublePair {
  id: string;
  playerIds: string[];
  displayName: string;
}

export interface DoublesMatch {
  id: string;
  pair1Id: string;
  pair2Id: string;
  tripleActive1: number | null;
  tripleActive2: number | null;
  score1: number | null;
  score2: number | null;
  completed: boolean;
  round: number;
}

export interface DoublesTournament {
  id: string;
  name: string;
  players: Player[];
  pairs: DoublePair[];
  matches: DoublesMatch[];
  currentRound: number;
  totalRounds: number;
  createdAt: number;
}

export interface DoublesStandingEntry {
  pair: DoublePair;
  rank: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  points: number;
}
