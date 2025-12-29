'use client';

import { GameState, House, SemiFinalSubRound } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountdownTimer } from './countdown-timer';
import { Users, Shield, Skull } from 'lucide-react';
import Image from 'next/image';

type PublicDisplayProps = {
  gameState: GameState;
};

const PhaseDisplay = ({ gameState }: { gameState: GameState }) => {
  const { currentRoundName, rounds } = gameState;
  const round = rounds[currentRoundName];
  const isSemiFinal = currentRoundName.includes('Semi-Final');
  const currentSubRound: SemiFinalSubRound | undefined = isSemiFinal ? round.subRounds?.[round.semiFinalRound] : undefined;
  const roundData = isSemiFinal ? currentSubRound : round;

  switch (round.phase) {
    case 'idle':
        if (currentRoundName === 'Final' && round.locked) {
            const winner = Object.entries(gameState.scoreboard).sort(([,a],[,b]) => b - a)[0];
            return (
                 <div className="text-center flex flex-col items-center gap-8">
                    <h2 className="text-5xl font-headline text-primary animate-pulse">WINNER!</h2>
                    <p className="text-8xl font-bold text-accent">{winner[0]}</p>
                    <p className="text-4xl text-white">Score: {winner[1]}</p>
                </div>
            )
        }
        return (
            <div className="text-center flex flex-col items-center gap-8">
                <Image src="/poster.jpg" alt="The Traitors Poster" width={300} height={420} className="rounded-lg shadow-lg border-4 border-primary" data-ai-hint="game poster" />
                <p className="text-2xl text-accent animate-pulse">Waiting for the round to begin...</p>
            </div>
        );
    case 'setup':
        return (
            <div className="text-center flex flex-col items-center gap-8">
                <Users className="w-24 h-24 text-primary animate-pulse" />
                <p className="text-3xl font-headline text-accent">House Selection for {currentRoundName}</p>
                <p className="text-xl text-muted-foreground">The moderator is choosing which houses will compete.</p>
            </div>
        );
    case 'words':
        return <div className="text-center"><p className="text-2xl text-accent animate-pulse">The stage is being set...</p></div>;
    case 'describe':
      return (
        <div className="text-center space-y-4">
          <p className="text-3xl font-headline">Describe Phase</p>
          {round.timerEndsAt && <CountdownTimer endTime={round.timerEndsAt} />}
        </div>
      );
    case 'vote':
      return <div className="text-center"><p className="text-4xl font-headline text-destructive animate-pulse">VOTING IN PROGRESS</p></div>;
    case 'reveal':
        if (!roundData) return null;

        return (
            <Card className="bg-transparent border-accent/20">
                <CardHeader><CardTitle className="text-primary text-center font-headline text-3xl">THE REVEAL</CardTitle></CardHeader>
                <CardContent className="space-y-6 text-xl text-center">
                    <div className="animate-fade-in-up animation-delay-100">
                        <p className="text-muted-foreground">The Traitor was...</p>
                        <p className="font-bold text-2xl text-destructive">{roundData.traitorHouse}</p>
                    </div>
                    
                    <div className="animate-fade-in-up animation-delay-300 flex items-center justify-center gap-4">
                        {roundData.voteOutcome === 'caught' ? (
                            <>
                            <Skull className="w-12 h-12 text-destructive" />
                            <p className="font-bold text-2xl text-primary">TRAITOR ELIMINATED</p>
                            </>
                        ) : (
                            <>
                            <Shield className="w-12 h-12 text-green-500" />
                            <p className="font-bold text-2xl text-green-500">TRAITOR SURVIVED</p>
                            </>
                        )}
                    </div>
                   
                     <div className="animate-fade-in-up animation-delay-500 grid grid-cols-2 gap-4 pt-4">
                        <div>
                            <p className="text-muted-foreground">Common Word</p>
                            <p className="font-bold text-2xl">{roundData.commonWord}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Traitor Word</p>
                            <p className="font-bold text-2xl">{roundData.traitorWord}</p>
                        </div>
                    </div>
                     {roundData.votedOutHouse && (
                        <div className="animate-fade-in-up animation-delay-700 text-center">
                             <p className="text-muted-foreground">Voted Out</p>
                             <p className="font-bold text-2xl text-amber-500">{roundData.votedOutHouse}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    default:
      return null;
  }
};

export const PublicDisplay = ({ gameState }: PublicDisplayProps) => {
  const { eventName, currentRoundName, rounds, eliminatedHouses } = gameState;
  const round = rounds[currentRoundName];
  const isSemiFinal = currentRoundName.includes('Semi-Final');

  const roundTitle = isSemiFinal ? `${currentRoundName} - Round ${round.semiFinalRound + 1}` : currentRoundName;

  return (
    <div className="flex flex-col h-full p-6 md:p-10 bg-gradient-to-b from-background to-black">
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-4">
            <h1 className="text-4xl font-headline tracking-widest uppercase text-primary">{eventName}</h1>
        </div>
        <p className="text-2xl text-accent font-medium mt-2">{roundTitle}</p>
      </header>

      <main className="flex-grow flex items-center justify-center text-6xl font-bold">
        <PhaseDisplay gameState={gameState} />
      </main>

      {eliminatedHouses.length > 0 && (
          <footer className="mt-8">
            <Card className="bg-background/50">
                <CardHeader>
                    <CardTitle className="text-xl text-center text-destructive font-headline">Eliminated Houses</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                        {eliminatedHouses.map(house => (
                            <p key={house} className="text-lg text-muted-foreground line-through">{house}</p>
                        ))}
                    </div>
                </CardContent>
            </Card>
          </footer>
      )}
    </div>
  );
};
