'use client';

import { useState, useEffect, useCallback } from 'react';
import { produce } from 'immer';
import { GameState, RoundName, House, HOUSES, ROUND_NAMES, RoundState, SubRound, VoteOutcome } from '@/lib/types';
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
        timerEndsAt: null,
      },
    ])
  ) as Record<RoundName, RoundState>,
  eliminatedHouses: initialEliminatedHouses,
  scores: Object.fromEntries(HOUSES.map(h => [h, 0])) as Record<House, number>,
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

const getInitialStateFromStorage = (): GameState => {
    if (typeof window === 'undefined') {
      return initialGameState;
    }
    try {
      const storedState = window.localStorage.getItem('gameState');
      return storedState ? JSON.parse(storedState) : initialGameState;
    } catch (error) {
      console.error("Failed to parse game state from localStorage", error);
      return initialGameState;
    }
}


export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const [roundCompletedMessage, setRoundCompletedMessage] = useState<string | null>(null);

  useEffect(() => {
    setGameState(getInitialStateFromStorage());
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
        try {
            const currentState = JSON.stringify(gameState);
            if (window.localStorage.getItem('gameState') !== currentState) {
                window.localStorage.setItem('gameState', currentState);
                window.dispatchEvent(new StorageEvent('storage', { key: 'gameState' }));
            }
        } catch (error) {
            console.error("Failed to save game state to localStorage", error);
        }
    }
  }, [gameState, isInitialized]);


  useEffect(() => {
    const syncState = (event: StorageEvent) => {
        if (event.key === 'gameState' && isInitialized) {
            const newState = getInitialStateFromStorage();
            if (JSON.stringify(newState) !== JSON.stringify(gameState)) {
                setGameState(newState);
            }
        }
    };

    window.addEventListener('storage', syncState);
    return () => {
      window.removeEventListener('storage', syncState);
    };
  }, [gameState, isInitialized]);


  useEffect(() => {
    if (roundCompletedMessage) {
      toast({ title: 'All Semi-Finals Complete', description: roundCompletedMessage });
      setRoundCompletedMessage(null);
    }
  }, [roundCompletedMessage, toast]);

  const currentRound = gameState.rounds[gameState.currentRoundName];
  const activeHouses = currentRound?.participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h)) || [];
  const currentSubRound = currentRound?.subRounds?.[currentRound.currentSubRoundIndex];

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
      toast({ title: 'Error', description: 'Must select exactly 6 houses.', variant: 'destructive' });
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
    if (!currentRound || currentRound.phase !== 'idle' || currentRound.locked) {
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
    if (!currentRound || currentRound.phase !== 'words') return;

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
    if (!currentRound || currentRound.phase !== 'describe') return;
    const endTime = Date.now() + durationSeconds * 1000;
    updateCurrentRound(draft => { draft.timerEndsAt = endTime; });
  };

  const endDescribePhase = () => {
    if (!currentRound || currentRound.phase !== 'describe') return;
    updateCurrentRound(draft => { draft.phase = 'vote'; draft.timerEndsAt = null; });
    toast({ title: 'Describe Phase Over', description: 'Voting is now open.' });
  };

  const submitVoteOutcome = (outcome: VoteOutcome) => {
    if (!currentRound || currentRound.phase !== 'vote' || !currentSubRound) return;
    
    if (outcome === 'caught') {
        setGameState(prev => produce(prev, draft => {
            const traitor = currentSubRound.traitorHouse;
            if (!draft.eliminatedHouses.includes(traitor)) {
                draft.eliminatedHouses.push(traitor);
                toast({ title: 'Traitor Eliminated!', description: `${traitor} is out of the game.` });
            }
        }));
    } else {
        toast({ title: 'Traitor Survived!', description: `The Traitor was not identified.` });
    }

    updateCurrentRound(draft => {
        const subRound = draft.subRounds![draft.currentSubRoundIndex];
        subRound.voteOutcome = outcome;
        draft.phase = 'reveal';
    });
  };

  const endRound = () => {
    if (!currentRound) return;
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
        if (currentRoundIndex < ROUND_NAMES.length - 1) {
            const nextRoundName = ROUND_NAMES[currentRoundIndex + 1];
            setGameState(prev => produce(prev, draft => {
                draft.currentRoundName = nextRoundName;
                draft.rounds[nextRoundName].phase = 'setup';
            }));
        } else {
            setRoundCompletedMessage("All semi-finals are complete.");
        }
    }
  };

  return { 
    gameState, 
    isInitialized,
    selectRound,
    startRound,
    setWords,
    startPhaseTimer,
    submitVoteOutcome,
    endRound,
    setParticipatingHouses,
    activeHouses,
    currentSubRound,
    endDescribePhase,
  };
};
