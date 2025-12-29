'use client';

import { useState } from 'react';
import { produce } from 'immer';
import { GameState, RoundName, House, HOUSES, ROUND_NAMES, RoundState, SubRound, IndividualVote, RoundResult } from '@/lib/types';
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
        participatingHouses: [],
        currentSubRoundIndex: 0,
        subRounds: [],
        locked: false,
        finalResults: [],
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
  const isFinal = currentRound.name === 'Final';
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
    if ((isSemiFinal || isFinal) && currentRound.participatingHouses.length === 0) {
        toast({ title: 'Error', description: 'Please select houses for the round first.', variant: 'destructive' });
        return;
    }

    if (isSemiFinal) {
        updateCurrentRound(draft => { draft.phase = 'words'; });
        toast({ title: `Round ${currentRound.currentSubRoundIndex + 1} Started`, description: `The traitor is ${currentSubRound?.traitorHouse}` });
    } else { // Final Round
        const shuffledTraitors = shuffle([...currentRound.participatingHouses]);
        updateCurrentRound(draft => {
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
            draft.phase = 'words';
        });
        toast({ title: 'Final Round Started', description: `Traitors for all 6 rounds have been assigned.` });
    }
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
    
    if (isSemiFinal) {
        const nonTraitorVotes = votes.filter(v => v.voterHouse !== currentSubRound.traitorHouse);
        const correctVotes = nonTraitorVotes.filter(v => v.votedFor === currentSubRound.traitorHouse).length;
        const totalNonTraitorVoters = currentRound.participatingHouses.filter(h => h !== currentSubRound.traitorHouse).length * 3; // Assuming 3 members
        const outcome = (correctVotes / totalNonTraitorVoters) > 0.5 ? 'caught' : 'not-caught';
        
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

        updateCurrentRound(draft => {
            const subRound = draft.subRounds![draft.currentSubRoundIndex];
            subRound.voteOutcome = outcome;
            subRound.individualVotes = votes;
            draft.phase = 'reveal';
        });

    } else if (isFinal) {
        const { traitorHouse } = currentSubRound;
        const roundPoints = Object.fromEntries(currentRound.participatingHouses.map(h => [h, 0])) as Record<House, number>;

        // 1. Determine if Traitor is caught
        const nonTraitorVoters = currentRound.participatingHouses.filter(h => h !== traitorHouse);
        const eligibleVoterCount = nonTraitorVoters.length * 3; // 15
        const votesForTraitor = votes.filter(v => v.voterHouse !== traitorHouse && v.votedFor === traitorHouse).length;
        const isCaught = votesForTraitor >= (eligibleVoterCount * 2/3); // >= 10

        // 2. Apply Traitor survival or catch points & Clean Sweep
        if (isCaught) {
            roundPoints[traitorHouse] -= 15;
            nonTraitorVoters.forEach(h => roundPoints[h] += 15);
        } else { // Traitor Survives
            roundPoints[traitorHouse] += 35;
            
            // Check for Clean Sweep
            const voteCounts: Record<string, number> = {};
            votes.filter(v => v.voterHouse !== traitorHouse).forEach(v => {
                if(v.votedFor) voteCounts[v.votedFor] = (voteCounts[v.votedFor] || 0) + 1;
            });
            const mostVotedIncorrectHouse = Object.entries(voteCounts).filter(([h,]) => h !== traitorHouse).sort((a,b) => b[1] - a[1])[0];
            if(mostVotedIncorrectHouse && mostVotedIncorrectHouse[1] >= (eligibleVoterCount * 2/3)) {
                roundPoints[traitorHouse] += 15; // +35 + 15 bonus = 50
                nonTraitorVoters.forEach(h => roundPoints[h] -= 6);
                toast({title: "TRAITOR CLEAN SWEEP!", description: `${traitorHouse} gets a massive bonus!`});
            }
        }

        // 3. Apply individual vote points
        votes.forEach(vote => {
            if (vote.votedFor === traitorHouse) {
                // Traitor self-vote
                if (vote.voterHouse === traitorHouse) {
                    roundPoints[vote.voterHouse] += 3;
                } else { // Correct individual vote
                    roundPoints[vote.voterHouse] += 5;
                }
            }
        });

        // 4. Apply team-level voting bonuses or penalties
        currentRound.participatingHouses.forEach(house => {
            const teamVotes = votes.filter(v => v.voterHouse === house);
            if(teamVotes.length === 3) {
                 if (teamVotes.every(v => v.votedFor === traitorHouse)) {
                    // All 3 members voted correctly
                    if(house !== traitorHouse) roundPoints[house] += 15;
                } else if (teamVotes.every(v => v.votedFor !== traitorHouse && v.votedFor !== null)) {
                    // All 3 members voted incorrectly for another house
                    roundPoints[house] -= 10;
                }
            }
        });
        
        const result: RoundResult = {
            roundIndex: currentSubRound.roundIndex,
            traitorHouse: traitorHouse,
            commonWord: currentSubRound.commonWord,
            traitorWord: currentSubRound.traitorWord,
            points: roundPoints,
            outcome: isCaught ? 'Caught' : 'Survived',
            votedOutHouse: null
        };
        
        setGameState(produce(draft => {
            Object.entries(roundPoints).forEach(([house, points]) => {
                draft.scoreboard[house as House] += points;
            });
            const subRound = draft.rounds.Final.subRounds[draft.rounds.Final.currentSubRoundIndex];
            subRound.points = roundPoints;
            subRound.individualVotes = votes;
            draft.rounds.Final.finalResults?.push(result);
            draft.rounds.Final.phase = 'reveal'; // Show round summary before next
        }));
    }

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

    } else { // End of all sub-rounds for the current Round (Semi-Final or Final)
        if (isSemiFinal) {
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
        } else { // End of Final
            updateCurrentRound(draft => { 
                draft.locked = true; 
                draft.phase = 'final-results';
            });
            toast({ title: 'Grand Finale Over!', description: 'The final results are in!' });
        }
    }
  };
  
  const endSemiFinals = () => {
    const semi1Survivors = gameState.rounds['Semi-Final 1'].participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h));
    const semi2Survivors = gameState.rounds['Semi-Final 2'].participatingHouses.filter(h => !gameState.eliminatedHouses.includes(h));
    
    // Top 3 from each advance. Assume houses are pre-sorted or take first 3.
    const finalists = [...new Set([...semi1Survivors.slice(0, 3), ...semi2Survivors.slice(0, 3)])].slice(0, 6);
    const eliminatedForAllTime = HOUSES.filter(h => !finalists.includes(h));

    setGameState(produce(draft => {
      draft.eliminatedHouses = [...new Set([...draft.eliminatedHouses, ...eliminatedForAllTime])];
      draft.currentRoundName = 'Final';
      const finalRound = draft.rounds['Final'];
      finalRound.participatingHouses = finalists;
      finalRound.phase = 'idle';
    }));
    toast({ title: 'Finals Set!', description: 'The 6 finalists are locked in.' });
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
    isSemiFinal,
    isFinal,
    endDescribePhase,
    endSemiFinals,
  };
};
