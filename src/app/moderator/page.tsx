'use client';

import { ModeratorDashboard } from '@/components/moderator-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useGameState } from '@/hooks/use-game-state';

export default function ModeratorPage() {
  const gameStateManager = useGameState();

  if (!gameStateManager.isInitialized) {
    return (
        <main className="flex h-screen w-full bg-background font-body text-foreground p-4 md:p-6">
            <div className="w-full space-y-4">
                <Skeleton className="h-12 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </main>
    )
  }

  return (
    <main className="flex h-screen w-full bg-background font-body text-foreground">
      <div className="w-full h-screen overflow-y-auto border-r border-border">
        <ModeratorDashboard {...gameStateManager} />
      </div>
    </main>
  );
}
