export type House = 'Sundarbans' | 'Kanha' | 'Wayanad' | 'Kaziranga' | 'Corbett' | 'Bandipur' | 'Nilgiri' | 'Gir' | 'Nallamala' | 'Saranda' | 'Pichavaram' | 'Namdapha';
export const HOUSES: House[] = ['Sundarbans', 'Kanha', 'Wayanad', 'Kaziranga', 'Corbett', 'Bandipur', 'Nilgiri', 'Gir', 'Nallamala', 'Saranda', 'Pichavaram', 'Namdapha'];

export type RoundName = 'Qualifier' | 'Semi-Final 1' | 'Semi-Final 2' | 'Final';
export const ROUND_NAMES: RoundName[] = ['Qualifier', 'Semi-Final 1', 'Semi-Final 2', 'Final'];

export type Phase = 'idle' | 'setup'| 'words' | 'describe' | 'vote' | 'reveal' | 'summary';

export interface RoundState {
  name: RoundName;
  participatingHouses: House[];
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
