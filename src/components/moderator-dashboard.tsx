'use client';

import { GameState, RoundName, House, HOUSES, ROUND_NAMES, IndividualVote } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Play, Timer, Vote, Shuffle, Lock, Users, Forward, Skull } from 'lucide-react';
import { useGameState } from '@/hooks/use-game-state';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

type ModeratorDashboardProps = ReturnType<typeof useGameState>;

const wordsSchema = z.object({
    commonWord: z.string().min(1, 'Common word is required.'),
    traitorWord: z.string().min(1, 'Traitor word is required.'),
});

const housesSchema = z.object({
  houses: z.array(z.string()).refine(value => value.length === 6, 'You must select exactly 6 houses.'),
});

const voteSchema = z.object({
  votes: z.array(z.object({
    voterHouse: z.string(),
    voterIndex: z.number(),
    votedFor: z.string().nullable(),
  })),
});

export const ModeratorDashboard = (props: ModeratorDashboardProps) => {
    const { gameState, selectRound, startRound, setWords, startPhaseTimer, submitVote, endRound, setParticipatingHouses, activeHouses, currentSubRound, endDescribePhase } = props;
    const { currentRoundName, rounds } = gameState;
    const round = rounds[currentRoundName];

    const wordsForm = useForm<z.infer<typeof wordsSchema>>({ resolver: zodResolver(wordsSchema), defaultValues: { commonWord: '', traitorWord: '' } });
    const housesForm = useForm<z.infer<typeof housesSchema>>({ resolver: zodResolver(housesSchema), defaultValues: { houses: round.participatingHouses || [] } });
    const voteForm = useForm<z.infer<typeof voteSchema>>({
        defaultValues: {
            votes: round.participatingHouses.flatMap(house => [0,1,2].map(i => ({ voterHouse: house, voterIndex: i, votedFor: null })))
        }
    });

    useEffect(() => {
        voteForm.reset({
            votes: round.participatingHouses.flatMap(house => [0,1,2].map(i => ({ voterHouse: house, voterIndex: i, votedFor: null })))
        });
    }, [round.participatingHouses, voteForm]);

    useEffect(() => {
        wordsForm.reset({
            commonWord: currentSubRound?.commonWord || '',
            traitorWord: currentSubRound?.traitorWord || '',
        });
    }, [currentSubRound, wordsForm]);


  return (
    <div className="p-4 md:p-6">
      <header className="mb-6">
        <h2 className="text-2xl font-headline text-primary">Moderator Dashboard</h2>
        <p className="text-muted-foreground">THE TRAITORS 2026</p>
      </header>
      <Tabs defaultValue="control">
        <TabsList className="w-full">
            <TabsTrigger value="control" className="w-full">Round Control</TabsTrigger>
        </TabsList>
        <TabsContent value="control" className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Game Management</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Select onValueChange={(val: RoundName) => selectRound(val)} value={currentRoundName}>
                        <SelectTrigger><SelectValue placeholder="Select a round" /></SelectTrigger>
                        <SelectContent>
                            {ROUND_NAMES.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{currentRoundName} {currentSubRound && `- Round ${currentSubRound.roundIndex + 1} of ${round.subRounds?.length}`}</CardTitle>
                    <CardDescription>Current Phase: <span className="font-bold text-primary">{round.phase}</span> {round.locked && "(Locked)"}</CardDescription>
                     {currentSubRound && round.phase !== 'setup' && round.phase !== 'idle' && (
                        <div className="!mt-4 p-3 rounded-md border border-destructive bg-destructive/10">
                            <p className="text-sm font-medium text-destructive-foreground/80 flex items-center gap-2">
                                <Skull className="h-4 w-4 text-destructive" />
                                This round's Traitor is: <span className="font-bold text-lg text-destructive">{currentSubRound.traitorHouse}</span>
                            </p>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">
                    {round.phase === 'setup' && (
                        <Form {...housesForm}>
                        <form onSubmit={housesForm.handleSubmit(data => setParticipatingHouses(data.houses as House[]))} className="space-y-4">
                            <FormField
                            control={housesForm.control}
                            name="houses"
                            render={() => (
                                <FormItem>
                                <div className="mb-4">
                                    <FormLabel className="text-base">Select 6 Houses for {currentRoundName}</FormLabel>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                {HOUSES.map((house) => (
                                    <FormField
                                    key={house}
                                    control={housesForm.control}
                                    name="houses"
                                    render={({ field }) => {
                                        const isEliminated = gameState.eliminatedHouses.includes(house);
                                        return (
                                        <FormItem
                                            key={house}
                                            className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                            <FormControl>
                                            <Checkbox
                                                checked={!isEliminated && field.value?.includes(house)}
                                                disabled={isEliminated}
                                                onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), house])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                        (value) => value !== house
                                                        )
                                                    )
                                                }}
                                            />
                                            </FormControl>
                                            <FormLabel className={cn("font-normal", isEliminated && "text-muted-foreground line-through")}>
                                            {house}
                                            </FormLabel>
                                        </FormItem>
                                        )
                                    }}
                                    />
                                ))}
                                </div>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <Button type="submit"><Users /> Confirm Selection</Button>
                        </form>
                        </Form>
                    )}
                    
                    { round.phase === 'idle' && !round.locked && <Button onClick={startRound}><Shuffle /> Start Round</Button>}

                    {round.phase === 'words' && (
                        <Form {...wordsForm}>
                            <form onSubmit={wordsForm.handleSubmit((data) => setWords(data.commonWord, data.traitorWord))} className="space-y-4">
                                <FormField name="commonWord" control={wordsForm.control} render={({field}) => (
                                    <FormItem><FormLabel>Common Word</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField name="traitorWord" control={wordsForm.control} render={({field}) => (
                                    <FormItem><FormLabel>Traitor Word</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <Button type="submit"><Play/>Set Words & Start Describe</Button>
                            </form>
                        </Form>
                    )}

                    {round.phase === 'describe' && (
                        <div className="space-y-4">
                            <p className="font-bold">Per-House Timer Control</p>
                            <div className="grid grid-cols-2 gap-4">
                            {activeHouses.map(house => (
                                <Button key={house} onClick={() => startPhaseTimer(30, house)} variant="outline">
                                    <Timer className="mr-2"/> Start for {house}
                                </Button>
                            ))}
                            </div>
                            <Button onClick={endDescribePhase} variant="secondary"><Forward /> End Describe & Start Vote</Button>
                        </div>
                    )}

                    {round.phase === 'vote' && (
                        <Form {...voteForm}>
                            <form onSubmit={voteForm.handleSubmit(data => submitVote(data.votes as IndividualVote[]))} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {round.participatingHouses.map(house => (
                                    <div key={house}>
                                        <h4 className="font-bold mb-2">{house}</h4>
                                        {[0,1,2].map(memberIndex => {
                                            const fieldIndex = round.participatingHouses.indexOf(house) * 3 + memberIndex;
                                            return (
                                                <FormField
                                                    key={fieldIndex}
                                                    control={voteForm.control}
                                                    name={`votes.${fieldIndex}.votedFor`}
                                                    render={({ field }) => (
                                                        <FormItem className="mb-2">
                                                            <FormLabel>Member {memberIndex + 1}</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Vote..." /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {round.participatingHouses.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                            )
                                        })}
                                    </div>
                                ))}
                                </div>
                                <Button type="submit"><Vote/>Submit All Votes</Button>
                            </form>
                        </Form>
                    )}

                    {round.phase === 'reveal' && (
                         <Button onClick={endRound} variant="destructive"><Lock/> End Sub-Round</Button>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
