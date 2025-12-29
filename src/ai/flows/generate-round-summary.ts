'use server';

/**
 * @fileOverview A round summary generation AI agent.
 *
 * - generateRoundSummary - A function that generates a summary of the round.
 * - GenerateRoundSummaryInput - The input type for the generateRoundSummary function.
 * - GenerateRoundSummaryOutput - The return type for the generateRoundSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRoundSummaryInputSchema = z.object({
  traitorHouse: z.string().describe('The house that was the traitor in the round.'),
  outcome: z.string().describe('The outcome of the round (Traitor Caught / Not Caught).'),
  pointsAwarded: z.record(z.number()).describe('The points awarded to each house.'),
  timestamp: z.string().describe('The timestamp of when the round ended.'),
});
export type GenerateRoundSummaryInput = z.infer<typeof GenerateRoundSummaryInputSchema>;

const GenerateRoundSummaryOutputSchema = z.object({
  summary: z.string().describe('A captivating summary of the round.'),
});
export type GenerateRoundSummaryOutput = z.infer<typeof GenerateRoundSummaryOutputSchema>;

export async function generateRoundSummary(input: GenerateRoundSummaryInput): Promise<GenerateRoundSummaryOutput> {
  return generateRoundSummaryFlow(input);
}

const generateRoundSummaryPrompt = ai.definePrompt({
  name: 'generateRoundSummaryPrompt',
  input: {schema: GenerateRoundSummaryInputSchema},
  output: {schema: GenerateRoundSummaryOutputSchema},
  prompt: `You are a game show host, expert at recapping rounds in an exciting way.
  Write a short summary of the round, highlighting the key events. Focus on making the summary engaging and captivating for the viewers.
  Include the following information:
  - The traitor house: {{{traitorHouse}}}
  - The outcome of the round: {{{outcome}}}
  - Points Awarded: {{#each (toArray pointsAwarded)}}- {{this.[0]}}: {{this.[1]}}\n{{/each}}
  - Timestamp: {{{timestamp}}}
  `,
});

const generateRoundSummaryFlow = ai.defineFlow(
  {
    name: 'generateRoundSummaryFlow',
    inputSchema: GenerateRoundSummaryInputSchema,
    outputSchema: GenerateRoundSummaryOutputSchema,
  },
  async input => {
    const {output} = await generateRoundSummaryPrompt(input);
    return output!;
  }
);
