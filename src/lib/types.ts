export type House = 'Sundarbans' | 'Kanha' | 'Wayanad' | 'Kaziranga' | 'Corbett' | 'Bandipur' | 'Nilgiri' | 'Gir' | 'Nallamala' | 'Saranda' | 'Pichavaram' | 'Namdapha';
export const HOUSES: House[] = ['Sundarbans', 'Kanha', 'Wayanad', 'Kaziranga', 'Corbett', 'Bandipur', 'Nilgiri', 'Gir', 'Nallamala', 'Saranda', 'Pichavaram', 'Namdapha'];

export type RoundName = 'Semi-Final 1' | 'Semi-Final 2' | 'Final';
export const ROUND_NAMES: RoundName[] = ['Semi-Final 1', 'Semi-Final 2', 'Final'];

export type Phase = 'idle' | 'setup'| 'words' | 'describe' | 'vote' | 'reveal';

export interface SemiFinalSubRound {
  roundIndex: number; // 0-5
  traitorHouse: House;
  commonWord: string;
  traitorWord: string;
  wordSet: boolean;
  timerEndsAt: number | null;
  voteOutcome: 'caught' | 'not-caught' | null;
  votedOutHouse: House | null;
  points: Record<House, number>;
}

export interface RoundState {
  name: RoundName;
  participatingHouses: House[];
  // For semi-finals
  semiFinalRound: number; // 0-5
  subRounds?: SemiFinalSubRound[];
  // For final round
  traitorHouse: House | null; 
  commonWord: string;
  traitorWord: string;
  timerEndsAt: number | null;
  voteOutcome: 'caught' | 'not-caught' | null;
  votedOutHouse: House | null;
  points: Record<House, number>;
  locked: boolean;
  phase: Phase;
}

export interface GameState {
  eventName: string;
  currentRoundName: RoundName;
  rounds: Record<RoundName, RoundState>;
  scoreboard: Record<House, number>;
  eliminatedHouses: House[];
}
