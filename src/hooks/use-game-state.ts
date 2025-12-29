'use client';

import { useState } from 'react';
import { produce } from 'immer';
import { GameState, RoundName, House, HOUSES, ROUND_NAMES, RoundState, SubRound, IndividualVote } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const initialEliminatedHouses: House[] = [];

const initialGameState: GameState = {
  eventName: 'THE TRAITORS',
  currentRoundName: 'Semi-Final 1',
  rounds: Object.fromEntries(
    ROUND_NAMES.map(name => [
      name,
      {
        name: name,
        phase: 'setup',
        participatingHouses: [],
        currentSubRoundIndex: 0,
        subRounds: [],
        locked: false,
      },
    ])
  ) as Record<RoundName, RoundState>,
  eliminatedHouses: initialEliminatedHouses,
};

// Fisher-Yates shuffle
const shuffle = (array: any[]) => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const { toast } = useToast();

  const currentRound = gameState.rounds[gameState.currentRoundName];
  const activeHouses = currentRound.participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h));
  const currentSubRound = currentRound.subRounds?.[currentRound.currentSubRoundIndex];

  const updateCurrentRound = (updater: (draft: RoundState) => void) => {
    setGameState(prev => produce(prev, draft => {
      updater(draft.rounds[draft.currentRoundName]);
    }));
  };

  const selectRound = (roundName: RoundName) => {
    setGameState(produce(draft => { draft.currentRoundName = roundName; }));
  };

  const setParticipatingHouses = (houses: House[]) => {
    if (houses.length !== 6) {
      toast({ title: 'Error', description: 'Must select exactly 6 houses for a semi-final.', variant: 'destructive' });
      return;
    }
    
    const shuffledTraitors = shuffle([...houses]);

    updateCurrentRound(draft => {
        draft.participatingHouses = houses;
        draft.phase = 'idle';
        draft.subRounds = shuffledTraitors.map((traitor, index) => ({
            roundIndex: index,
            traitorHouse: traitor,
            commonWord: '',
            traitorWord: '',
            wordSet: false,
            timerEndsAt: null,
            voteOutcome: null,
            votedOutHouse: null,
        }));
    });

    toast({ title: 'Houses Set', description: `Houses & Traitors for ${currentRound.name} are locked in.`});
  };

  const startRound = () => {
    if (currentRound.phase !== 'idle' || currentRound.locked) {
        toast({ title: 'Error', description: 'Round is already in progress or locked.', variant: 'destructive' });
        return;
    }
    if (currentRound.participatingHouses.length === 0) {
        toast({ title: 'Error', description: 'Please select houses for the round first.', variant: 'destructive' });
        return;
    }

    updateCurrentRound(draft => { draft.phase = 'words'; });
    toast({ title: `Round ${currentRound.currentSubRoundIndex + 1} Started`, description: `The traitor has been selected.` });
  };
  
  const setWords = (commonWord: string, traitorWord: string) => {
    if (currentRound.phase !== 'words') return;

    if (currentSubRound) {
        updateCurrentRound(draft => {
            const subRound = draft.subRounds![draft.currentSubRoundIndex];
            subRound.commonWord = commonWord;
            subRound.traitorWord = traitorWord;
            subRound.wordSet = true;
            draft.phase = 'describe';
        });
    }
    toast({ title: 'Words Set', description: 'Ready for the description phase.' });
  };
  
  const startPhaseTimer = (durationSeconds: number, forHouse?: House) => {
    if (currentRound.phase !== 'describe') return;
    const endTime = Date.now() + durationSeconds * 1000;
    updateCurrentRound(draft => { draft.timerEndsAt = endTime; });
  };

  const endDescribePhase = () => {
    if (currentRound.phase !== 'describe') return;
    updateCurrentRound(draft => { draft.phase = 'vote'; draft.timerEndsAt = null; });
    toast({ title: 'Describe Phase Over', description: 'Voting is now open.' });
  };

  const submitVote = (votes: IndividualVote[]) => {
    if (currentRound.phase !== 'vote' || !currentSubRound) return;
    
    const nonTraitorVotes = votes.filter(v => v.voterHouse !== currentSubRound.traitorHouse);
    const correctVotes = nonTraitorVotes.filter(v => v.votedFor === currentSubRound.traitorHouse).length;
    const totalNonTraitorVoters = currentRound.participatingHouses.filter(h => h !== currentSubRound.traitorHouse && !gameState.eliminatedHouses.includes(h)).length * 3;
    const outcome = totalNonTraitorVoters > 0 && (correctVotes / totalNonTraitorVoters) > 0.5 ? 'caught' : 'not-caught';
    
    if (outcome === 'caught') {
        setGameState(prev => produce(prev, draft => {
            const traitor = currentSubRound.traitorHouse;
            if (!draft.eliminatedHouses.includes(traitor)) {
                draft.eliminatedHouses.push(traitor);
                toast({ title: 'Traitor Eliminated!', description: `${traitor} is out of the game.` });
            }
        }));
    }

    updateCurrentRound(draft => {
        const subRound = draft.subRounds![draft.currentSubRoundIndex];
        subRound.voteOutcome = outcome;
        subRound.individualVotes = votes;
        draft.phase = 'reveal';
    });

    toast({ title: 'Vote Submitted', description: 'The results are in!' });
  };

  const endRound = () => {
    const nextSubRoundIndex = currentRound.currentSubRoundIndex + 1;
    if (nextSubRoundIndex < currentRound.subRounds.length) {
        updateCurrentRound(draft => {
            draft.currentSubRoundIndex = nextSubRoundIndex;
            draft.phase = 'words';
        });
        toast({ title: `Next Round`, description: `Moving to Round ${nextSubRoundIndex + 1}` });
    } else { 
        updateCurrentRound(draft => { draft.locked = true; draft.phase = 'idle'; });
        const currentRoundIndex = ROUND_NAMES.indexOf(gameState.currentRoundName);
        const nextRoundName = ROUND_NAMES[currentRoundIndex + 1];
        if(nextRoundName) {
            selectRound(nextRoundName);
            setGameState(prev => produce(prev, draft => {
                draft.rounds[nextRoundName].phase = 'setup';
            }));
        } else {
            toast({title: "All Semi-Finals Complete", description: "The game has concluded."})
        }
    }
  };

  return { 
    gameState, 
    selectRound,
    startRound,
    setWords,
    startPhaseTimer,
    submitVote,
    endRound,
    setParticipatingHouses,
    activeHouses,
    currentSubRound,
    endDescribePhase,
  };
};
