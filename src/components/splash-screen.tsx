'use client';

export const SplashScreen = () => {
    return (
        <main className="flex h-screen w-full flex-col items-center justify-center bg-black font-body text-foreground">
            <div className="text-center">
                <h1 className="text-5xl md:text-7xl font-headline uppercase text-primary animate-title-glitch">
                    The Traitors
                </h1>
                <p className="mt-4 text-xl text-accent animate-pulse">Loading Game State...</p>
            </div>
        </main>
    )
}
