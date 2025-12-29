'use client';

import { PublicDisplay } from '@/components/public-display';
import { Skeleton } from '@/components/ui/skeleton';
import { useGameState } from '@/hooks/use-game-state';

export default function Home() {
  const gameStateManager = useGameState();

  if (!gameStateManager.isInitialized) {
    return (
        <main className="flex h-screen w-full bg-background font-body text-foreground p-4 md:p-6">
             <div className="w-full flex flex-col items-center justify-center gap-8">
                <Skeleton className="h-24 w-3/4" />
                <Skeleton className="h-64 w-1/2" />
                <Skeleton className="h-12 w-full" />
            </div>
        </main>
    )
  }

  return (
    <main className="flex h-screen w-full bg-background font-body text-foreground">
      <PublicDisplay gameState={gameStateManager.gameState} />
    </main>
  );
}
