
'use client';

import { useState, useEffect, useCallback } from 'react';
import { produce } from 'immer';
import { GameState, RoundName, House, ROUND_NAMES, RoundState, SubRound, VoteOutcome } from '@/lib/types';
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

const LOCAL_STORAGE_KEY = 'traitors-game-state';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const [roundCompletedMessage, setRoundCompletedMessage] = useState<string | null>(null);

  // Load state from localStorage on initial client-side render
  useEffect(() => {
    try {
      const savedState = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedState) {
        setGameState(JSON.parse(savedState));
      } else {
        // If no saved state, initialize it
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialGameState));
      }
    } catch (error) {
      console.error("Failed to load game state from localStorage", error);
    }
    setIsInitialized(true);

    // Listen for changes from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LOCAL_STORAGE_KEY && event.newValue) {
        setGameState(JSON.parse(event.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const updateLocalStorageState = useCallback((newState: GameState) => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error("Failed to save game state to localStorage", error);
      toast({ title: 'Error', description: 'Could not save game state.', variant: 'destructive'});
    }
  }, [toast]);
  

  useEffect(() => {
    if (roundCompletedMessage) {
      toast({ title: 'All Semi-Finals Complete', description: roundCompletedMessage });
      setRoundCompletedMessage(null);
    }
  }, [roundCompletedMessage, toast]);

  const currentRound = gameState.rounds[gameState.currentRoundName];
  const activeHouses = currentRound?.participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h)) || [];
  const currentSubRound = currentRound?.subRounds?.[currentRound.currentSubRoundIndex];

  const updateState = (updater: (draft: GameState) => void) => {
    const newState = produce(gameState, updater);
    setGameState(newState);
    updateLocalStorageState(newState);
  };
  
  const updateCurrentRound = (updater: (draft: RoundState) => void) => {
    updateState(draft => {
      updater(draft.rounds[draft.currentRoundName]);
    });
  };

  const selectRound = (roundName: RoundName) => {
    updateState(draft => { draft.currentRoundName = roundName; });
  };

  const setParticipatingHouses = (houses: House[]) => {
    if (houses.length !== 6) {
      toast({ title: 'Error', description: 'Must select exactly 6 houses.', variant: 'destructive' });
      return;
    }
    
    const shuffledTraitors = shuffle([...houses]);

    updateState(draft => {
      const round = draft.rounds[draft.currentRoundName];
      round.participatingHouses = houses;
      round.phase = 'idle';
      round.subRounds = shuffledTraitors.map((traitor, index) => ({
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
    
    updateState(draft => {
        const subRound = draft.rounds[draft.currentRoundName].subRounds![draft.currentRound.currentSubRoundIndex];
        subRound.voteOutcome = outcome;
        draft.rounds[draft.currentRoundName].phase = 'reveal';
        
        if (outcome === 'caught') {
            const traitor = currentSubRound.traitorHouse;
            if (!draft.eliminatedHouses.includes(traitor)) {
                draft.eliminatedHouses.push(traitor);
            }
             toast({ title: 'Traitor Eliminated!', description: `${traitor} is out of the game.` });
        } else {
            toast({ title: 'Traitor Survived!', description: `The Traitor was not identified.` });
        }
    });
  };

  const endRound = () => {
    if (!currentRound) return;
    const nextSubRoundIndex = currentRound.currentSubRoundIndex + 1;

    updateState(draft => {
      if (nextSubRoundIndex < currentRound.subRounds.length) {
          const round = draft.rounds[draft.currentRoundName];
          round.currentSubRoundIndex = nextSubRoundIndex;
          round.phase = 'words';
          toast({ title: `Next Round`, description: `Moving to Round ${nextSubRoundIndex + 1}` });
      } else { 
          const round = draft.rounds[draft.currentRoundName];
          round.locked = true; 
          round.phase = 'idle';
          const currentRoundIndex = ROUND_NAMES.indexOf(draft.currentRoundName);
          if (currentRoundIndex < ROUND_NAMES.length - 1) {
              const nextRoundName = ROUND_NAMES[currentRoundIndex + 1];
              draft.currentRoundName = nextRoundName;
              if (draft.rounds[nextRoundName]) {
                  draft.rounds[nextRoundName].phase = 'setup';
              }
          } else {
              setRoundCompletedMessage("All semi-finals are complete.");
          }
      }
    });
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
