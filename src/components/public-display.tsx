'use client';

import { GameState, House } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountdownTimer } from './countdown-timer';
import { Users } from 'lucide-react';
import Image from 'next/image';

type PublicDisplayProps = {
  gameState: GameState;
};

const PhaseDisplay = ({ gameState }: { gameState: GameState }) => {
  const { currentRoundName, rounds } = gameState;
  const round = rounds[currentRoundName];

  switch (round.phase) {
    case 'idle':
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
        return (
            <Card className="bg-transparent border-accent/20">
                <CardHeader><CardTitle className="text-primary text-center font-headline text-3xl">THE REVEAL</CardTitle></CardHeader>
                <CardContent className="space-y-6 text-xl text-center">
                    <div className="animate-fade-in-up animation-delay-100">
                        <p className="text-muted-foreground">The Traitor was...</p>
                        <p className="font-bold text-2xl text-destructive">{round.traitorHouse}</p>
                    </div>
                    <div className="animate-fade-in-up animation-delay-300">
                        <p className="text-muted-foreground">Result</p>
                        <p className="font-bold text-2xl text-primary">{round.voteOutcome === 'caught' ? 'TRAITOR CAUGHT' : 'TRAITOR ESCAPED'}</p>
                    </div>
                     <div className="animate-fade-in-up animation-delay-500 grid grid-cols-2 gap-4 pt-4">
                        <div>
                            <p className="text-muted-foreground">Common Word</p>
                            <p className="font-bold text-2xl">{round.commonWord}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Traitor Word</p>
                            <p className="font-bold text-2xl">{round.traitorWord}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    default:
      return null;
  }
};

export const PublicDisplay = ({ gameState }: PublicDisplayProps) => {
  const { eventName, currentRoundName } = gameState;

  return (
    <div className="flex flex-col h-full p-6 md:p-10 bg-gradient-to-b from-background to-black">
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-4">
            <h1 className="text-4xl font-headline tracking-widest uppercase text-primary">{eventName}</h1>
        </div>
        <p className="text-2xl text-accent font-medium mt-2">{currentRoundName}</p>
      </header>

      <main className="flex-grow flex items-center justify-center text-6xl font-bold">
        <PhaseDisplay gameState={gameState} />
      </main>
    </div>
  );
};
