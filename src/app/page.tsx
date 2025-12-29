'use client';

import { ModeratorDashboard } from '@/components/moderator-dashboard';
import { PublicDisplay } from '@/components/public-display';
import { useGameState } from '@/hooks/use-game-state';
import { cn } from '@/lib/utils';

export default function Home() {
  const gameStateManager = useGameState();

  return (
    <main className="flex h-screen w-full bg-background font-body text-foreground">
      <div className="w-full lg:w-1/2 h-screen overflow-y-auto border-r border-border">
        <ModeratorDashboard {...gameStateManager} />
      </div>
      <div className={cn('hidden lg:block lg:w-1/2 h-screen overflow-y-auto')}>
        <PublicDisplay gameState={gameStateManager.gameState} />
      </div>
    </main>
  );
}
