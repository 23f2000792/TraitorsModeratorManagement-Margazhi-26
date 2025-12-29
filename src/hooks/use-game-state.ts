'use client';

import { useState } from 'react';
import { GameState, RoundName, House, HOUSES, ROUND_NAMES, RoundState } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const initialGameState: GameState = {
  eventName: 'THE TRAITORS',
  currentRoundName: 'Semi-Final 1',
  rounds: Object.fromEntries(
    ROUND_NAMES.map(name => [
      name,
      {
        name: name,
        participatingHouses: name.includes('Final') ? [...HOUSES] : [],
        traitorHouse: null,
        commonWord: '',
        traitorWord: '',
        phase: name.includes('Semi-Final') ? 'setup' : 'idle',
        timerEndsAt: null,
        voteOutcome: null,
        votedOutHouse: null,
        points: Object.fromEntries(HOUSES.map(h => [h, 0])) as Record<House, number>,
        locked: false,
      },
    ])
  ) as Record<RoundName, RoundState>,
  scoreboard: Object.fromEntries(HOUSES.map(h => [h, 100])) as Record<House, number>,
  eliminatedHouses: [],
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const { toast } = useToast();

  const currentRound = gameState.rounds[gameState.currentRoundName];
  const activeHouses = currentRound.participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h));


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
    if ((currentRound.phase !== 'idle' && currentRound.phase !== 'setup') || currentRound.locked) {
        toast({ title: 'Error', description: 'Round is already in progress or locked.', variant: 'destructive' });
        return;
    }
    if (currentRound.name.includes('Semi-Final') && currentRound.participatingHouses.length === 0) {
        toast({ title: 'Error', description: 'Please select houses for the semi-final first.', variant: 'destructive' });
        return;
    }

    const availableHouses = currentRound.name.includes('Final')
      ? HOUSES.filter(h => !gameState.eliminatedHouses.includes(h))
      : activeHouses;
      
    if (availableHouses.length === 0) {
        toast({ title: 'Error', description: 'No houses available to start the round.', variant: 'destructive' });
        return;
    }

    const traitorHouse = availableHouses[Math.floor(Math.random() * availableHouses.length)];
    
    // For Final round, ensure all non-eliminated houses are participating
    if (currentRound.name.includes('Final')) {
        updateCurrentRound({ participatingHouses: availableHouses, traitorHouse, phase: 'words' });
    } else {
        updateCurrentRound({ traitorHouse, phase: 'words' });
    }

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
    
    let newEliminatedHouses = [...gameState.eliminatedHouses];

    if (currentRound.name.includes('Semi-Final')) {
        // As per rules: if Traitor House is identified by more than 50% voters (except the Traitor House) -> Eliminated
        // In a 6-house semi-final, there are 5 non-traitor houses.
        // The moderator directly tells us if the traitor was 'caught'. We just enforce the elimination.
        if (outcome === 'caught' && currentRound.traitorHouse) {
            if (!newEliminatedHouses.includes(currentRound.traitorHouse)) {
                newEliminatedHouses.push(currentRound.traitorHouse);
                toast({ title: 'Traitor Eliminated!', description: `${currentRound.traitorHouse} has been eliminated for being caught.` });
            }
        }
        if (votedOut) {
            if (!newEliminatedHouses.includes(votedOut)) {
                newEliminatedHouses.push(votedOut);
                 toast({ title: 'Voted Out!', description: `${votedOut} has been voted out.` });
            }
        }
        setGameState(prev => ({...prev, eliminatedHouses: newEliminatedHouses}));
        updateCurrentRound({ voteOutcome: outcome, votedOutHouse: votedOut, phase: 'reveal' });

    } else { // Final round logic
        const roundPoints = Object.fromEntries(HOUSES.map(h => [h, 0])) as Record<House, number>;
        let newScoreboard = { ...gameState.scoreboard };
        const participating = activeHouses;

        if (outcome === 'caught') {
            participating.forEach(house => {
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
        if (votedOut) {
            newScoreboard[votedOut] -= 10; // Small penalty for being voted out
        }

        participating.forEach(house => {
            newScoreboard[house] += roundPoints[house];
        });

        updateCurrentRound({ voteOutcome: outcome, votedOutHouse: votedOut, phase: 'reveal', points: roundPoints });
        setGameState(prev => ({...prev, scoreboard: newScoreboard}));
    }

    toast({ title: 'Vote Submitted', description: 'The results are in!' });
  };

  const applyScoreAdjustment = (house: House, adjustment: number) => {
    setGameState(prev => {
        const newScoreboard = { ...prev.scoreboard, [house]: prev.scoreboard[house] + adjustment};
        return {...prev, scoreboard: newScoreboard};
    });
    toast({ title: 'Score Adjusted', description: `${house} score changed by ${adjustment}.`});
  };

  const endRound = () => {
    updateCurrentRound({ locked: true });

    // Logic for advancing to the next round or ending the game
    const currentRoundIndex = ROUND_NAMES.indexOf(gameState.currentRoundName);
    const isLastSemiFinal = gameState.currentRoundName === 'Semi-Final 2';

    if (isLastSemiFinal) {
        // After semi-final 2, determine who goes to the final.
        const semi1 = gameState.rounds['Semi-Final 1'];
        const semi2 = gameState.rounds['Semi-Final 2'];

        const semi1Survivors = semi1.participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h));
        const semi2Survivors = semi2.participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h));
        
        // Take top 3 from each.
        const finalists = [...semi1Survivors.slice(0,3), ...semi2Survivors.slice(0,3)];
        const eliminatedForAllTime = HOUSES.filter(h => !finalists.includes(h));
        
        setGameState(prev => ({
            ...prev,
            eliminatedHouses: eliminatedForAllTime,
            currentRoundName: 'Final',
            rounds: {
                ...prev.rounds,
                'Final': { ...prev.rounds['Final'], phase: 'idle', participatingHouses: finalists }
            }
        }));
        toast({ title: 'Finals Set!', description: 'The finalists are locked in.'});
        return;
    }

     const nextRoundIndex = currentRoundIndex + 1;
     if(nextRoundIndex < ROUND_NAMES.length) {
        const nextRoundName = ROUND_NAMES[nextRoundIndex];
        selectRound(nextRoundName);
        if (nextRoundName.includes('Semi-Final')) {
          setGameState(prev => ({
            ...prev,
            rounds: {
              ...prev.rounds,
              [nextRoundName]: { ...prev.rounds[nextRoundName], phase: 'setup' }
            }
          }));
        } else { // This would be the final
           setGameState(prev => ({
            ...prev,
            rounds: {
              ...prev.rounds,
              [nextRoundName]: { ...prev.rounds[nextRoundName], phase: 'idle' }
            }
          }));
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
    endRound,
    setParticipatingHouses,
    activeHouses,
  };
};
