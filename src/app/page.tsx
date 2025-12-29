'use client';

import { PublicDisplay } from '@/components/public-display';
import { SplashScreen } from '@/components/splash-screen';
import { useGameState } from '@/hooks/use-game-state';

export default function Home() {
  const gameStateManager = useGameState();

  if (!gameStateManager.isInitialized) {
    return <SplashScreen />;
  }

  return (
    <main className="flex h-screen w-full bg-background font-body text-foreground">
      <PublicDisplay gameState={gameStateManager.gameState} />
    </main>
  );
}
