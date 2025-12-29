export type House = 'Sundarbans' | 'Kanha' | 'Wayanad' | 'Kaziranga' | 'Corbett' | 'Bandipur' | 'Nilgiri' | 'Gir' | 'Nallamala' | 'Saranda' | 'Pichavaram' | 'Namdapha';
export const HOUSES: House[] = ['Sundarbans', 'Kanha', 'Wayanad', 'Kaziranga', 'Corbett', 'Bandipur', 'Nilgiri', 'Gir', 'Nallamala', 'Saranda', 'Pichavaram', 'Namdapha'];

export type RoundName = 'Semi-Final 1' | 'Semi-Final 2';
export const ROUND_NAMES: RoundName[] = ['Semi-Final 1', 'Semi-Final 2'];

export type Phase = 'idle' | 'setup'| 'words' | 'describe' | 'vote' | 'reveal';

export type IndividualVote = {
  voterHouse: House;
  voterIndex: number; // 0, 1, 2
  votedFor: House | null;
}

export interface SubRound {
  roundIndex: number; 
  traitorHouse: House;
  commonWord: string;
  traitorWord: string;
  wordSet: boolean;
  timerEndsAt: number | null;
  voteOutcome: 'caught' | 'not-caught' | null;
  votedOutHouse: House | null;
  individualVotes?: IndividualVote[];
}

export interface RoundState {
  name: RoundName;
  participatingHouses: House[];
  currentSubRoundIndex: number; 
  subRounds: SubRound[];
  locked: boolean;
  phase: Phase;
}

export interface GameState {
  eventName: string;
  currentRoundName: RoundName;
  rounds: Record<RoundName, RoundState>;
  eliminatedHouses: House[];
}
