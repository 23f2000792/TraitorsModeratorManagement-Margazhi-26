
'use client';

import { useState, useEffect, useCallback } from 'react';
import { produce } from 'immer';
import { GameState, RoundName, House, HOUSES, ROUND_NAMES, RoundState, SubRound, VoteOutcome } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, setDoc, getFirestore, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

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

const GAME_STATE_DOC_ID = 'primary';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();
  const [roundCompletedMessage, setRoundCompletedMessage] = useState<string | null>(null);
  const { firestore } = useFirebase();

  const updateFirestoreState = useCallback(async (newState: GameState) => {
    if (firestore) {
      try {
        await setDoc(doc(firestore, 'gameState', GAME_STATE_DOC_ID), newState, { merge: true });
      } catch (error) {
        console.error("Failed to save game state to Firestore", error);
        toast({ title: 'Connection Error', description: 'Failed to save game state. Check your connection.', variant: 'destructive'});
      }
    }
  }, [firestore, toast]);


  useEffect(() => {
    if (firestore) {
      const docRef = doc(firestore, 'gameState', GAME_STATE_DOC_ID);
      
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as GameState;
          setGameState(data);
        } else {
          // Document doesn't exist, so let's create it with the initial state
          setDoc(docRef, initialGameState).then(() => {
            setGameState(initialGameState);
          });
        }
        setIsInitialized(true);
      }, (error) => {
        console.error("Failed to subscribe to game state", error);
        toast({ title: 'Connection Error', description: 'Could not connect to the game state. Please refresh.', variant: 'destructive'});
        setIsInitialized(true); // Still allow the app to run with initial state
      });

      return () => unsubscribe();
    }
  }, [firestore, toast]);
  

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
    const newState = produce(gameState, draft => {
      updater(draft.rounds[draft.currentRoundName]);
    });
    setGameState(newState);
    updateFirestoreState(newState);
  };

  const selectRound = (roundName: RoundName) => {
    const newState = produce(gameState, draft => { draft.currentRoundName = roundName; });
    setGameState(newState);
    updateFirestoreState(newState);
  };

  const setParticipatingHouses = (houses: House[]) => {
    if (houses.length !== 6) {
      toast({ title: 'Error', description: 'Must select exactly 6 houses.', variant: 'destructive' });
      return;
    }
    
    const shuffledTraitors = shuffle([...houses]);

    const newState = produce(gameState, draft => {
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

    setGameState(newState);
    updateFirestoreState(newState);
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
    
    const newState = produce(gameState, draft => {
        const subRound = draft.rounds[draft.currentRoundName].subRounds![draft.currentRound.currentSubRoundIndex];
        subRound.voteOutcome = outcome;
        draft.rounds[draft.currentRoundName].phase = 'reveal';
        
        if (outcome === 'caught') {
            const traitor = currentSubRound.traitorHouse;
            if (!draft.eliminatedHouses.includes(traitor)) {
                draft.eliminatedHouses.push(traitor);
                toast({ title: 'Traitor Eliminated!', description: `${traitor} is out of the game.` });
            }
        } else {
            toast({ title: 'Traitor Survived!', description: `The Traitor was not identified.` });
        }
    });
    setGameState(newState);
    updateFirestoreState(newState);
  };

  const endRound = () => {
    if (!currentRound) return;
    const nextSubRoundIndex = currentRound.currentSubRoundIndex + 1;

    const newState = produce(gameState, draft => {
      if (nextSubRoundIndex < currentRound.subRounds.length) {
          const round = draft.rounds[draft.currentRoundName];
          round.currentSubRoundIndex = nextSubRoundIndex;
          round.phase = 'words';
          toast({ title: `Next Round`, description: `Moving to Round ${nextSubRoundIndex + 1}` });
      } else { 
          draft.rounds[draft.currentRoundName].locked = true; 
          draft.rounds[draft.currentRoundName].phase = 'idle';
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

    setGameState(newState);
    updateFirestoreState(newState);
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

