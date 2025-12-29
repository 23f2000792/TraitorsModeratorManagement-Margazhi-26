'use client';

import { PublicDisplay } from '@/components/public-display';
import { useGameState } from '@/hooks/use-game-state';

export default function Home() {
  // For now, the public page will also hold the game state.
  // This will be replaced by Firestore later.
  const gameStateManager = useGameState();

  return (
    <main className="flex h-screen w-full bg-background font-body text-foreground">
      <PublicDisplay gameState={gameStateManager.gameState} />
    </main>
  );
}
