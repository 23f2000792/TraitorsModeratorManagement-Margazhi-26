'use client';

import { GameState, RoundName, House, HOUSES, ROUND_NAMES } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Eye, Play, Timer, Vote, Shuffle, MinusCircle, PlusCircle, Lock, Users, Forward, Flag } from 'lucide-react';
import { useGameState } from '@/hooks/use-game-state';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

type ModeratorDashboardProps = ReturnType<typeof useGameState>;

const wordsSchema = z.object({
    commonWord: z.string().min(1, 'Common word is required.'),
    traitorWord: z.string().min(1, 'Traitor word is required.'),
});

const timerSchema = z.object({
    duration: z.coerce.number().min(1, 'Duration must be at least 1 second.'),
});

const voteSchema = z.object({
    outcome: z.enum(['caught', 'not-caught']),
    votedOut: z.string().nullable(),
});

const housesSchema = z.object({
  houses: z.array(z.string()).refine(value => value.length === 6, 'You must select exactly 6 houses.'),
});


export const ModeratorDashboard = (props: ModeratorDashboardProps) => {
    const { gameState, selectRound, startRound, setWords, startPhaseTimer, submitVote, applyScoreAdjustment, endRound, setParticipatingHouses, activeHouses, currentSubRound, isSemiFinal, endDescribePhase, endSemiFinals } = props;
    const { currentRoundName, rounds, scoreboard } = gameState;
    const round = rounds[currentRoundName];
    const roundData = isSemiFinal ? currentSubRound : round;

    const wordsForm = useForm<z.infer<typeof wordsSchema>>({ resolver: zodResolver(wordsSchema), defaultValues: { commonWord: '', traitorWord: '' } });
    const timerForm = useForm<z.infer<typeof timerSchema>>({ resolver: zodResolver(timerSchema), defaultValues: { duration: 30 } });
    const voteForm = useForm<z.infer<typeof voteSchema>>({ resolver: zodResolver(voteSchema), defaultValues: { outcome: 'caught', votedOut: null } });
    const housesForm = useForm<z.infer<typeof housesSchema>>({ resolver: zodResolver(housesSchema), defaultValues: { houses: round.participatingHouses || [] } });

    useEffect(() => {
        wordsForm.reset({
            commonWord: roundData?.commonWord || '',
            traitorWord: roundData?.traitorWord || '',
        });
        voteForm.reset({
            outcome: roundData?.voteOutcome || 'caught',
            votedOut: roundData?.votedOutHouse || null,
        });
    }, [roundData, wordsForm, voteForm]);


  return (
    <div className="p-4 md:p-6">
      <header className="mb-6">
        <h2 className="text-2xl font-headline text-primary">Moderator Dashboard</h2>
        <p className="text-muted-foreground">THE TRAITORS 2026</p>
      </header>
      <Tabs defaultValue="control">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="control">Round Control</TabsTrigger>
            <TabsTrigger value="scores">Scoreboard</TabsTrigger>
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
                    {isSemiFinal && round.locked && <Button onClick={endSemiFinals}><Flag /> Finalize Semi-Finals</Button>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{currentRoundName} {isSemiFinal && `- Round ${round.semiFinalRound + 1} of ${round.subRounds?.length}`}</CardTitle>
                    <CardDescription>Current Phase: <span className="font-bold text-primary">{round.phase}</span> {round.locked && "(Locked)"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* House Selection for Semi-Finals */}
                    {round.phase === 'setup' && isSemiFinal && (
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

                    {/* Word Assignment */}
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

                     {/* Timer */}
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

                    {/* Voting */}
                    {round.phase === 'vote' && (
                        <Form {...voteForm}>
                            <form onSubmit={voteForm.handleSubmit(data => submitVote(data.outcome, data.votedOut as House | null))} className="space-y-4">
                                <FormField control={voteForm.control} name="outcome" render={({field}) => (
                                    <FormItem><FormLabel>Vote Outcome</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="caught">Traitor Caught</SelectItem><SelectItem value="not-caught">Traitor Not Caught</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <FormField control={voteForm.control} name="votedOut" render={({field}) => (
                                    <FormItem><FormLabel>House Voted Out (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value || "none"}><FormControl><SelectTrigger><SelectValue placeholder="Select house" /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="none">None</SelectItem>{activeHouses.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                )}/>
                                <Button type="submit"><Vote/>Submit Vote</Button>
                            </form>
                        </Form>
                    )}

                    {/* Reveal & End */}
                    {round.phase === 'reveal' && (
                         <Button onClick={endRound} variant="destructive"><Lock/> {isSemiFinal ? "End Sub-Round" : "Lock Round"}</Button>
                    )}

                </CardContent>
            </Card>

        </TabsContent>
        <TabsContent value="scores">
            <Card>
                <CardHeader>
                    <CardTitle>Scoreboard</CardTitle>
                    <CardDescription>
                        {currentRoundName.includes('Final') ? 'Live scores for all houses.' : 'Scoreboard is only active during the Final round.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>House</TableHead><TableHead>Score</TableHead>{!isSemiFinal && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                        <TableBody>
                            {Object.entries(scoreboard).sort(([, a], [, b]) => b - a).map(([house, score]) => (
                                <TableRow key={house}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                      {((isSemiFinal && currentSubRound?.traitorHouse === house) || (!isSemiFinal && round.traitorHouse === house)) && <Eye className="w-4 h-4 text-destructive" />}
                                      <span className={cn(gameState.eliminatedHouses.includes(house as House) && "line-through text-muted-foreground")}>{house}</span>
                                    </TableCell>
                                    <TableCell>{score}</TableCell>
                                    {!isSemiFinal && <TableCell className="flex gap-2">
                                        <Button size="icon" variant="outline" onClick={() => applyScoreAdjustment(house as House, 10)}><PlusCircle size={16}/></Button>
                                        <Button size="icon" variant="outline" onClick={() => applyScoreAdjustment(house as House, -10)}><MinusCircle size={16}/></Button>
                                    </TableCell>}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
