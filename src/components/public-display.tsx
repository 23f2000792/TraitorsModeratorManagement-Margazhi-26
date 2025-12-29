'use client';

import { GameState, House } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CountdownTimer } from './countdown-timer';
import { Eye } from 'lucide-react';
import { TraitorLogo } from './icons';
import { cn } from '@/lib/utils';
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
    case 'summary':
        return (
            <Card className="bg-card/50">
                <CardHeader><CardTitle className="text-primary text-center font-headline text-3xl">Round Summary</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-lg whitespace-pre-wrap text-center italic">"{round.summary}"</p>
                </CardContent>
            </Card>
        );
    default:
      return null;
  }
};

export const PublicDisplay = ({ gameState }: PublicDisplayProps) => {
  const { eventName, currentRoundName, rounds, scoreboard } = gameState;
  const round = rounds[currentRoundName];

  return (
    <div className="flex flex-col h-full p-6 md:p-10 bg-gradient-to-b from-blue-900 via-blue-900 to-black">
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-4">
            <h1 className="text-4xl font-headline tracking-widest uppercase text-primary">{eventName}</h1>
        </div>
        <p className="text-2xl text-accent font-medium mt-2">{currentRoundName}</p>
      </header>

      <main className="flex-grow flex items-center justify-center text-6xl font-bold">
        <PhaseDisplay gameState={gameState} />
      </main>

      {(round.phase === 'reveal' || round.phase === 'summary') && (
         <footer className="mt-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline text-center text-primary">Scoreboard</CardTitle>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>House</TableHead>
                            <TableHead className="text-right">Round Points</TableHead>
                            <TableHead className="text-right">Total Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Object.entries(scoreboard).map(([house, score]) => (
                        <TableRow key={house} className={cn(round.traitorHouse === house && 'bg-destructive/20')}>
                            <TableCell className="font-medium flex items-center gap-2">
                                {round.traitorHouse === house && <Eye className="w-4 h-4 text-destructive" />}
                                {house}
                            </TableCell>
                            <TableCell className={cn("text-right font-mono", round.points[house as House] > 0 ? 'text-green-400' : 'text-red-500')}>
                                {round.points[house as House] > 0 ? '+' : ''}{round.points[house as House]}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">{score}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </footer>
      )}
    </div>
  );
};
