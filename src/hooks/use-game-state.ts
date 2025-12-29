'use client';

import { useState } from 'react';
import { GameState, RoundName, House, HOUSES, ROUND_NAMES, RoundState } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateRoundSummary } from '@/ai/flows/generate-round-summary';

const initialGameState: GameState = {
  eventName: 'THE TRAITORS',
  currentRoundName: 'Qualifier',
  rounds: Object.fromEntries(
    ROUND_NAMES.map(name => [
      name,
      {
        name: name,
        participatingHouses: name === 'Qualifier' || name === 'Final' ? [...HOUSES] : [],
        traitorHouse: null,
        commonWord: '',
        traitorWord: '',
        phase: name.includes('Semi-Final') ? 'setup' : 'idle',
        timerEndsAt: null,
        voteOutcome: null,
        votedOutHouse: null,
        points: Object.fromEntries(HOUSES.map(h => [h, 0])) as Record<House, number>,
        summary: '',
        locked: false,
      },
    ])
  ) as Record<RoundName, RoundState>,
  scoreboard: Object.fromEntries(HOUSES.map(h => [h, 100])) as Record<House, number>,
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const { toast } = useToast();

  const currentRound = gameState.rounds[gameState.currentRoundName];
  const activeHouses = currentRound.participatingHouses;


  const updateCurrentRound = (updates: Partial<RoundState>) => {
    setGameState(prev => ({
      ...prev,
      rounds: {
        ...prev.rounds,
        [prev.currentRoundName]: {
          ...prev.rounds[prev.currentRoundName],
          ...updates,
        },
      },
    }));
  };

  const selectRound = (roundName: RoundName) => {
    setGameState(prev => ({ ...prev, currentRoundName: roundName }));
  };

  const setParticipatingHouses = (houses: House[]) => {
    if (!currentRound.name.includes('Semi-Final') || houses.length !== 6) {
      toast({ title: 'Error', description: 'Must select exactly 6 houses for a semi-final.', variant: 'destructive' });
      return;
    }
    updateCurrentRound({ participatingHouses: houses, phase: 'idle' });
    toast({ title: 'Houses Set', description: `Houses for ${currentRound.name} are locked in.`});
  };

  const startRound = () => {
    if (currentRound.phase !== 'idle') {
      toast({ title: 'Error', description: 'Round is already in progress.', variant: 'destructive' });
      return;
    }
    const traitorHouse = activeHouses[Math.floor(Math.random() * activeHouses.length)];
    updateCurrentRound({ traitorHouse, phase: 'words' });
    toast({ title: 'Round Started', description: `${traitorHouse} is the Traitor!` });
  };
  
  const setWords = (commonWord: string, traitorWord: string) => {
    if (currentRound.phase !== 'words') {
        toast({ title: 'Error', description: 'Cannot set words at this stage.', variant: 'destructive' });
        return;
    }
    updateCurrentRound({ commonWord, traitorWord, phase: 'describe' });
    toast({ title: 'Words Set', description: 'Ready for the description phase.' });
  };
  
  const startPhaseTimer = (durationSeconds: number) => {
    if (currentRound.phase !== 'describe') {
        toast({ title: 'Error', description: 'Can only start timer in describe phase.', variant: 'destructive' });
        return;
    }
    const endTime = Date.now() + durationSeconds * 1000;
    updateCurrentRound({ timerEndsAt: endTime });
    
    setTimeout(() => {
        updateCurrentRound({ phase: 'vote', timerEndsAt: null });
        toast({ title: 'Time\'s Up!', description: 'Voting is now open.' });
    }, durationSeconds * 1000);
  };

  const submitVote = (outcome: 'caught' | 'not-caught', votedOut: House | null) => {
    if (currentRound.phase !== 'vote') {
      toast({ title: 'Error', description: 'Not in voting phase.', variant: 'destructive' });
      return;
    }
    
    const roundPoints = Object.fromEntries(HOUSES.map(h => [h, 0])) as Record<House, number>;
    let newScoreboard = { ...gameState.scoreboard };

    if (outcome === 'caught') {
        activeHouses.forEach(house => {
        if (house !== currentRound.traitorHouse) {
          roundPoints[house] = 20;
        } else {
          roundPoints[house] = -50;
        }
      });
    } else {
      if (currentRound.traitorHouse) {
        roundPoints[currentRound.traitorHouse] = 50;
      }
    }

    activeHouses.forEach(house => {
        newScoreboard[house] += roundPoints[house];
    });

    updateCurrentRound({ voteOutcome: outcome, votedOutHouse: votedOut, phase: 'reveal', points: roundPoints });
    setGameState(prev => ({...prev, scoreboard: newScoreboard}));

    toast({ title: 'Vote Submitted', description: 'The results are in!' });
  };

  const applyScoreAdjustment = (house: House, adjustment: number) => {
    setGameState(prev => {
        const newScoreboard = { ...prev.scoreboard, [house]: prev.scoreboard[house] + adjustment};
        return {...prev, scoreboard: newScoreboard};
    });
    toast({ title: 'Score Adjusted', description: `${house} score changed by ${adjustment}.`});
  };

  const generateSummary = async () => {
    if (currentRound.phase !== 'reveal') {
      toast({ title: 'Error', description: 'Can only generate summary after reveal.', variant: 'destructive' });
      return;
    }

    try {
      const result = await generateRoundSummary({
        traitorHouse: currentRound.traitorHouse!,
        outcome: currentRound.voteOutcome === 'caught' ? 'Traitor Caught' : 'Traitor Not Caught',
        pointsAwarded: currentRound.points,
        timestamp: new Date().toISOString(),
      });
      updateCurrentRound({ summary: result.summary, phase: 'summary' });
      toast({ title: 'Summary Generated', description: 'AI round summary is ready.' });
    } catch (error) {
      console.error('AI summary generation failed:', error);
      toast({ title: 'AI Error', description: 'Failed to generate round summary.', variant: 'destructive' });
    }
  };

  const endRound = () => {
    updateCurrentRound({ locked: true, phase: 'idle' });
     const nextRoundIndex = ROUND_NAMES.indexOf(gameState.currentRoundName) + 1;
     if(nextRoundIndex < ROUND_NAMES.length) {
        const nextRoundName = ROUND_NAMES[nextRoundIndex];
        const nextRound = gameState.rounds[nextRoundName];
        if (nextRound.name.includes('Semi-Final') && nextRound.participatingHouses.length === 0) {
            setGameState(prev => ({...prev, currentRoundName: nextRoundName}));
            updateCurrentRound({phase: 'setup'});
        } else {
            selectRound(nextRoundName);
        }
     }
    toast({ title: 'Round Ended', description: 'The round is now locked.' });
  };

  return { 
    gameState, 
    selectRound,
    startRound,
    setWords,
    startPhaseTimer,
    submitVote,
    applyScoreAdjustment,
    generateSummary,
    endRound,
    setParticipatingHouses,
    activeHouses,
  };
};
