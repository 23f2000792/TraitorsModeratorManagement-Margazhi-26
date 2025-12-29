'use client';

import { GameState, SubRound } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountdownTimer } from './countdown-timer';
import { Users, Shield, Skull, Hourglass, Vote, Eye } from 'lucide-react';
import Image from 'next/image';

type PublicDisplayProps = {
  gameState: GameState;
};

const PhaseTitle = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
    <div className="flex items-center justify-center gap-4 mb-8">
        {icon}
        <p className="text-3xl font-headline text-accent uppercase tracking-wider">{text}</p>
    </div>
);


const PhaseDisplay = ({ gameState }: { gameState: GameState }) => {
  const { currentRoundName, rounds } = gameState;
  const round = rounds[currentRoundName];
  const currentSubRound: SubRound | undefined = round.subRounds?.[round.currentSubRoundIndex];

  switch (round.phase) {
    case 'idle':
        if (round.locked) {
             return (
                <div className="text-center flex flex-col items-center gap-8 animate-fade-in-up">
                    <PhaseTitle icon={<Hourglass className="w-12 h-12 text-primary animate-pulse" />} text="Waiting for next round..." />
                </div>
            );
        }
        return (
            <div className="text-center flex flex-col items-center gap-8 animate-fade-in-up">
                <Image src="/poster.jpg" alt="The Traitors Poster" width={300} height={420} className="rounded-lg shadow-2xl shadow-primary/20 border-4 border-primary" data-ai-hint="game poster" />
                <p className="text-2xl text-accent animate-pulse mt-4">The game is about to begin...</p>
            </div>
        );
    case 'setup':
        return (
            <div className="text-center flex flex-col items-center gap-8 animate-fade-in-up">
                <PhaseTitle icon={<Users className="w-12 h-12 text-primary animate-pulse" />} text="House Selection" />
                <p className="text-2xl text-muted-foreground">The moderator is choosing which houses will compete.</p>
            </div>
        );
    case 'words':
        return (
             <div className="text-center flex flex-col items-center gap-8 animate-fade-in-up">
                <PhaseTitle icon={<Eye className="w-12 h-12 text-primary animate-pulse" />} text="The Stage is Being Set" />
                <p className="text-2xl text-accent animate-pulse">A traitor has been chosen. Words are being assigned.</p>
            </div>
        );
    case 'describe':
      return (
        <div className="text-center space-y-8 animate-fade-in-up">
          <PhaseTitle icon={<Hourglass className="w-12 h-12 text-primary" />} text="Describe Phase" />
          {round.timerEndsAt ? <CountdownTimer endTime={round.timerEndsAt} /> : <p className="text-4xl text-muted-foreground animate-pulse">Waiting to start timer...</p>}
        </div>
      );
    case 'vote':
      return (
        <div className="text-center animate-fade-in-up">
            <PhaseTitle icon={<Vote className="w-12 h-12 text-destructive" />} text="Voting in Progress" />
            <p className="text-3xl text-primary animate-pulse">The houses are casting their votes...</p>
        </div>
      );
    case 'reveal':
        if (!currentSubRound) return null;

        return (
            <Card className="bg-transparent border-accent/20 w-full max-w-2xl">
                <CardHeader><CardTitle className="text-primary text-center font-headline text-4xl">The Reveal</CardTitle></CardHeader>
                <CardContent className="space-y-8 text-2xl text-center">
                    <div className="animate-fade-in-up" style={{animationDelay: '100ms'}}>
                        <p className="text-muted-foreground">The Traitor was...</p>
                        <p className="font-bold text-4xl text-destructive mt-2">{currentSubRound.traitorHouse}</p>
                    </div>
                    
                    <div className="animate-fade-in-up flex items-center justify-center gap-4" style={{animationDelay: '500ms'}}>
                        {currentSubRound.voteOutcome === 'caught' ? (
                            <>
                            <Skull className="w-16 h-16 text-destructive" />
                            <p className="font-bold text-4xl text-primary">TRAITOR ELIMINATED</p>
                            </>
                        ) : (
                            <>
                            <Shield className="w-16 h-16 text-green-500" />
                            <p className="font-bold text-4xl text-green-500">TRAITOR SURVIVED</p>
                            </>
                        )}
                    </div>
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
  const currentSubRound = round.subRounds?.[round.currentSubRoundIndex];
  const roundTitle = currentSubRound ? `${currentRoundName} - Round ${round.currentSubRoundIndex + 1}` : currentRoundName;

  return (
    <div className="flex flex-col h-full w-full p-6 md:p-10 bg-gradient-to-b from-background via-black to-background">
      <header className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-5xl md:text-6xl font-headline tracking-widest uppercase text-primary" style={{ textShadow: '0 0 10px hsl(var(--primary)), 0 0 20px hsl(var(--primary))' }}>{eventName}</h1>
        <p className="text-2xl md:text-3xl text-accent font-medium mt-4 font-headline tracking-wide">{roundTitle}</p>
      </header>

      <main className="flex-grow flex items-center justify-center text-6xl font-bold">
        <PhaseDisplay gameState={gameState} />
      </main>

      {eliminatedHouses.length > 0 && (
          <footer className="mt-8 animate-fade-in-up" style={{animationDelay: '800ms'}}>
            <Card className="bg-black/50 border-destructive/30 max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-xl text-center text-destructive font-headline tracking-wider">Eliminated Houses</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                        {eliminatedHouses.map(house => (
                            <p key={house} className="text-lg text-muted-foreground line-through decoration-destructive decoration-2">{house}</p>
                        ))}
                    </div>
                </CardContent>
            </Card>
          </footer>
      )}
    </div>
  );
};
