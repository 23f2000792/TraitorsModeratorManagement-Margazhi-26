'use client';

import { useState } from 'react';
import { produce } from 'immer';
import { GameState, RoundName, House, HOUSES, ROUND_NAMES, RoundState, SemiFinalSubRound } from '@/lib/types';
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
        phase: name.includes('Semi-Final') ? 'setup' : 'idle',
        participatingHouses: name.includes('Final') ? HOUSES.filter(h => !initialEliminatedHouses.includes(h)) : [],
        // Semi-final specific
        semiFinalRound: 0,
        subRounds: name.includes('Semi-Final') ? [] : undefined,
        // Final specific
        traitorHouse: null,
        commonWord: '',
        traitorWord: '',
        timerEndsAt: null,
        voteOutcome: null,
        votedOutHouse: null,
        points: Object.fromEntries(HOUSES.map(h => [h, 0])) as Record<House, number>,
        locked: false,
      },
    ])
  ) as Record<RoundName, RoundState>,
  scoreboard: Object.fromEntries(HOUSES.map(h => [h, 0])) as Record<House, number>,
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
  const isSemiFinal = currentRound.name.includes('Semi-Final');
  const activeHouses = currentRound.participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h));
  const currentSubRound = isSemiFinal ? currentRound.subRounds?.[currentRound.semiFinalRound] : undefined;

  const updateCurrentRound = (updater: (draft: RoundState) => void) => {
    setGameState(prev => produce(prev, draft => {
      updater(draft.rounds[draft.currentRoundName]);
    }));
  };

  const selectRound = (roundName: RoundName) => {
    setGameState(produce(draft => { draft.currentRoundName = roundName; }));
  };

  const setParticipatingHouses = (houses: House[]) => {
    if (!isSemiFinal || houses.length !== 6) {
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
            points: {} as Record<House, number>
        }));
    });

    toast({ title: 'Houses Set', description: `Houses & Traitors for ${currentRound.name} are locked in.`});
  };

  const startRound = () => {
    if (currentRound.phase !== 'idle' || currentRound.locked) {
        toast({ title: 'Error', description: 'Round is already in progress or locked.', variant: 'destructive' });
        return;
    }
    if (isSemiFinal && currentRound.participatingHouses.length === 0) {
        toast({ title: 'Error', description: 'Please select houses for the semi-final first.', variant: 'destructive' });
        return;
    }

    if (isSemiFinal) {
        updateCurrentRound(draft => { draft.phase = 'words'; });
        toast({ title: `Round ${currentRound.semiFinalRound + 1} Started`, description: `The traitor is ${currentSubRound?.traitorHouse}` });
    } else { // Final Round
        const availableHouses = HOUSES.filter(h => !gameState.eliminatedHouses.includes(h));
        if (availableHouses.length === 0) {
            toast({ title: 'Error', description: 'No houses available to start the round.', variant: 'destructive' });
            return;
        }
        const traitorHouse = availableHouses[Math.floor(Math.random() * availableHouses.length)];
        updateCurrentRound(draft => {
            draft.participatingHouses = availableHouses;
            draft.traitorHouse = traitorHouse;
            draft.phase = 'words';
        });
        toast({ title: 'Final Round Started', description: `${traitorHouse} is the Traitor!` });
    }
  };
  
  const setWords = (commonWord: string, traitorWord: string) => {
    if (currentRound.phase !== 'words') return;

    if (isSemiFinal && currentSubRound) {
        updateCurrentRound(draft => {
            const subRound = draft.subRounds![draft.semiFinalRound];
            subRound.commonWord = commonWord;
            subRound.traitorWord = traitorWord;
            subRound.wordSet = true;
            draft.phase = 'describe';
        });
    } else { // Final
        updateCurrentRound(draft => {
            draft.commonWord = commonWord;
            draft.traitorWord = traitorWord;
            draft.phase = 'describe';
        });
    }
    toast({ title: 'Words Set', description: 'Ready for the description phase.' });
  };
  
  const startPhaseTimer = (durationSeconds: number, forHouse?: House) => {
    if (currentRound.phase !== 'describe') return;

    const endTime = Date.now() + durationSeconds * 1000;
    
    // In semi-finals and final, timer is per-house and controlled by moderator
    updateCurrentRound(draft => { draft.timerEndsAt = endTime; });
  };

  const endDescribePhase = () => {
    if (currentRound.phase !== 'describe') return;
    updateCurrentRound(draft => { draft.phase = 'vote'; draft.timerEndsAt = null; });
    toast({ title: 'Describe Phase Over', description: 'Voting is now open.' });
  };

  const submitVote = (outcome: 'caught' | 'not-caught', votedOutValue: string | null) => {
    if (currentRound.phase !== 'vote') return;
    
    const votedOut = votedOutValue === 'none' ? null : votedOutValue as House | null;

    if (isSemiFinal && currentSubRound) {
        updateCurrentRound(draft => {
            const subRound = draft.subRounds![draft.semiFinalRound];
            subRound.voteOutcome = outcome;
            subRound.votedOutHouse = votedOut;
            draft.phase = 'reveal';
        });

        // In Semi-finals, if traitor is caught, they are eliminated. No score.
        if (outcome === 'caught') {
            setGameState(prev => produce(prev, draft => {
                const traitor = currentSubRound.traitorHouse;
                if (!draft.eliminatedHouses.includes(traitor)) {
                    draft.eliminatedHouses.push(traitor);
                    toast({ title: 'Traitor Eliminated!', description: `${traitor} is out of the game.` });
                }
            }));
        }

    } else { // Final round logic
        let newScoreboard = { ...gameState.scoreboard };
        const roundPoints = Object.fromEntries(HOUSES.map(h => [h, 0])) as Record<House, number>;
        const participating = activeHouses;

        if (outcome === 'caught') {
            participating.forEach(house => {
                if (house !== currentRound.traitorHouse) roundPoints[house] = 20;
                else roundPoints[house] = -50;
            });
        } else {
            if (currentRound.traitorHouse) roundPoints[currentRound.traitorHouse] = 50;
        }
        if (votedOut) newScoreboard[votedOut] -= 10;

        Object.keys(newScoreboard).forEach(house => {
            newScoreboard[house as House] += roundPoints[house as House] || 0;
        });

        setGameState(prev => ({...prev, scoreboard: newScoreboard}));
        updateCurrentRound(draft => {
            draft.voteOutcome = outcome;
            draft.votedOutHouse = votedOut;
            draft.phase = 'reveal';
            draft.points = roundPoints;
        });
    }
    toast({ title: 'Vote Submitted', description: 'The results are in!' });
  };

  const applyScoreAdjustment = (house: House, adjustment: number) => {
    setGameState(prev => produce(prev, draft => {
        draft.scoreboard[house] += adjustment;
    }));
    toast({ title: 'Score Adjusted', description: `${house} score changed by ${adjustment}.`});
  };

  const endRound = () => { // This now ends a sub-round in semi-finals
    if (isSemiFinal) {
        const nextSubRoundIndex = currentRound.semiFinalRound + 1;
        if (nextSubRoundIndex < (currentRound.subRounds?.length || 0)) {
            updateCurrentRound(draft => {
                draft.semiFinalRound = nextSubRoundIndex;
                draft.phase = 'words';
            });
            toast({ title: `Next Round`, description: `Moving to Round ${nextSubRoundIndex + 1}` });

        } else {
             updateCurrentRound(draft => { draft.locked = true; draft.phase = 'idle'; });
             const currentRoundIndex = ROUND_NAMES.indexOf(gameState.currentRoundName);
             const nextRoundName = ROUND_NAMES[currentRoundIndex + 1];
             if(nextRoundName) {
                selectRound(nextRoundName);
                if (nextRoundName.includes('Semi-Final')) {
                  setGameState(prev => produce(prev, draft => {
                     draft.rounds[nextRoundName].phase = 'setup';
                  }));
                }
             } else {
                 toast({title: "All Semi-Finals Complete", description: "Advancing to Final Round setup."})
             }
        }
    } else { // Final round
        updateCurrentRound(draft => { draft.locked = true; });
        toast({ title: 'Final Round Ended', description: 'The round is now locked.' });
    }
  };
  
  const endSemiFinals = () => {
    const semi1Survivors = gameState.rounds['Semi-Final 1'].participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h));
    const semi2Survivors = gameState.rounds['Semi-Final 2'].participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h));
    
    // As per rules, top 3 from each advance
    const finalists = [...new Set([...semi1Survivors.slice(0, 3), ...semi2Survivors.slice(0, 3)])];
    const eliminatedForAllTime = HOUSES.filter(h => !finalists.includes(h));

    setGameState(produce(draft => {
      draft.eliminatedHouses = [...new Set([...draft.eliminatedHouses, ...eliminatedForAllTime])];
      draft.currentRoundName = 'Final';
      draft.rounds['Final'].participatingHouses = finalists;
      draft.rounds['Final'].phase = 'idle';
    }));
    toast({ title: 'Finals Set!', description: 'The finalists are locked in.' });
  };


  return { 
    gameState, 
    selectRound,
    startRound,
    setWords,
    startPhaseTimer,
    submitVote,
    applyScoreAdjustment,
    endRound,
    setParticipatingHouses,
    activeHouses,
    currentSubRound,
    isSemiFinal,
    endDescribePhase,
    endSemiFinals,
  };
};
