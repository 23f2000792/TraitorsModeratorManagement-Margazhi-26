'use client';

import { GameState, RoundName, House, HOUSES, ROUND_NAMES } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { Eye, Play, Timer, Vote, Shuffle, MinusCircle, PlusCircle, Lock, Users } from 'lucide-react';
import { useGameState } from '@/hooks/use-game-state';
import { cn } from '@/lib/utils';

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
    votedOut: z.enum(HOUSES as [string, ...string[]]).nullable(),
});

const housesSchema = z.object({
  houses: z.array(z.string()).refine(value => value.length === 6, 'You must select exactly 6 houses.'),
});


export const ModeratorDashboard = (props: ModeratorDashboardProps) => {
    const { gameState, selectRound, startRound, setWords, startPhaseTimer, submitVote, applyScoreAdjustment, endRound, setParticipatingHouses, activeHouses } = props;
    const { currentRoundName, rounds, scoreboard } = gameState;
    const round = rounds[currentRoundName];

    const wordsForm = useForm<z.infer<typeof wordsSchema>>({ resolver: zodResolver(wordsSchema), defaultValues: { commonWord: round.commonWord || '', traitorWord: round.traitorWord || '' } });
    const timerForm = useForm<z.infer<typeof timerSchema>>({ resolver: zodResolver(timerSchema), defaultValues: { duration: 300 } });
    const voteForm = useForm<z.infer<typeof voteSchema>>({ resolver: zodResolver(voteSchema), defaultValues: { outcome: round.voteOutcome || 'caught', votedOut: round.votedOutHouse || null } });
    const housesForm = useForm<z.infer<typeof housesSchema>>({ resolver: zodResolver(housesSchema), defaultValues: { houses: round.participatingHouses || [] } });

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
                    <CardTitle>Round Management</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Select onValueChange={(val: RoundName) => selectRound(val)} value={currentRoundName}>
                        <SelectTrigger><SelectValue placeholder="Select a round" /></SelectTrigger>
                        <SelectContent>
                            {ROUND_NAMES.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button onClick={startRound} disabled={(round.phase !== 'idle' && round.phase !== 'setup') || round.locked}><Shuffle />Start Round</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Phase Control</CardTitle>
                    <CardDescription>Current Phase: <span className="font-bold text-primary">{round.phase}</span> {round.locked && "(Locked)"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* House Selection for Semi-Finals */}
                    {round.phase === 'setup' && currentRoundName.includes('Semi-Final') && (
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
                    {/* Word Assignment */}
                    <Form {...wordsForm}>
                        <form onSubmit={wordsForm.handleSubmit((data) => setWords(data.commonWord, data.traitorWord))} className="space-y-4">
                            <FormField name="commonWord" control={wordsForm.control} render={({field}) => (
                                <FormItem><FormLabel>Common Word</FormLabel><FormControl><Input {...field} disabled={round.phase !== 'words'}/></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField name="traitorWord" control={wordsForm.control} render={({field}) => (
                                <FormItem><FormLabel>Traitor Word</FormLabel><FormControl><Input {...field} disabled={round.phase !== 'words'} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Button type="submit" disabled={round.phase !== 'words'}><Play/>Set Words & Start</Button>
                        </form>
                    </Form>
                     {/* Timer */}
                    <Form {...timerForm}>
                         <form onSubmit={timerForm.handleSubmit(data => startPhaseTimer(data.duration))} className="flex items-end gap-4">
                            <FormField name="duration" control={timerForm.control} render={({field}) => (
                                <FormItem><FormLabel>Timer (seconds)</FormLabel><FormControl><Input type="number" {...field} disabled={round.phase !== 'describe'} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Button type="submit" disabled={round.phase !== 'describe'}><Timer/>Start Timer</Button>
                        </form>
                    </Form>
                    {/* Voting */}
                    <Form {...voteForm}>
                        <form onSubmit={voteForm.handleSubmit(data => submitVote(data.outcome, data.votedOut))} className="space-y-4">
                            <FormField control={voteForm.control} name="outcome" render={({field}) => (
                                <FormItem><FormLabel>Vote Outcome</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} disabled={round.phase !== 'vote'}><FormControl><SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value="caught">Traitor Caught</SelectItem><SelectItem value="not-caught">Traitor Not Caught</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )}/>
                             <FormField control={voteForm.control} name="votedOut" render={({field}) => (
                                <FormItem><FormLabel>House Voted Out (Optional)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value || ""} disabled={round.phase !== 'vote'}><FormControl><SelectTrigger><SelectValue placeholder="Select house" /></SelectTrigger></FormControl>
                                <SelectContent><SelectItem value={null}>None</SelectItem>{activeHouses.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )}/>
                            <Button type="submit" disabled={round.phase !== 'vote'}><Vote/>Submit Vote</Button>
                        </form>
                    </Form>

                    {/* Reveal & End */}
                    <div className="flex gap-4">
                         <Button onClick={endRound} disabled={round.phase !== 'reveal'} variant="destructive"><Lock/>Lock Round</Button>
                    </div>

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
                        <TableHeader><TableRow><TableHead>House</TableHead><TableHead>Score</TableHead>{currentRoundName.includes('Final') && <TableHead>Actions</TableHead>}</TableRow></TableHeader>
                        <TableBody>
                            {Object.entries(scoreboard).sort(([, a], [, b]) => b - a).map(([house, score]) => (
                                <TableRow key={house}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                      {round.traitorHouse === house && currentRoundName === round.name && activeHouses.includes(house as House) && <Eye className="w-4 h-4 text-destructive" />}
                                      <span className={cn(gameState.eliminatedHouses.includes(house as House) && "line-through text-muted-foreground")}>{house}</span>
                                    </TableCell>
                                    <TableCell>{score}</TableCell>
                                    {currentRoundName.includes('Final') && <TableCell className="flex gap-2">
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
