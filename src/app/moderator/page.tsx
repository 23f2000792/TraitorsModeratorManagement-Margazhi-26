'use client';

import { ModeratorDashboard } from '@/components/moderator-dashboard';
import { useGameState } from '@/hooks/use-game-state';

export default function ModeratorPage() {
  const gameStateManager = useGameState();

  return (
    <main className="flex h-screen w-full bg-background font-body text-foreground">
      <div className="w-full h-screen overflow-y-auto border-r border-border">
        <ModeratorDashboard {...gameStateManager} />
      </div>
    </main>
  );
}
