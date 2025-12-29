export type House = 'House A' | 'House B' | 'House C' | 'House D' | 'House E' | 'House F';
export const HOUSES: House[] = ['House A', 'House B', 'House C', 'House D', 'House E', 'House F'];

export type RoundName = 'Qualifier' | 'Semi-Final 1' | 'Semi-Final 2' | 'Final';
export const ROUND_NAMES: RoundName[] = ['Qualifier', 'Semi-Final 1', 'Semi-Final 2', 'Final'];

export type Phase = 'idle' | 'words' | 'describe' | 'vote' | 'reveal' | 'summary';

export interface RoundState {
  name: RoundName;
  traitorHouse: House | null;
  commonWord: string;
  traitorWord: string;
  phase: Phase;
  timerEndsAt: number | null;
  voteOutcome: 'caught' | 'not-caught' | null;
  votedOutHouse: House | null;
  points: Record<House, number>;
  summary: string;
  locked: boolean;
}

export interface GameState {
  eventName: string;
  currentRoundName: RoundName;
  rounds: Record<RoundName, RoundState>;
  scoreboard: Record<House, number>;
}
