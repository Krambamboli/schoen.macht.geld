'use server';

/**
 * @fileOverview Generates funny news headlines for trending stocks.
 *
 * - generateFunnyNewsHeadline - A function that generates a funny news headline.
 * - GenerateFunnyNewsHeadlineInput - The input type for the generateFunnyNewsHeadline function.
 * - GenerateFunnyNewsHeadlineOutput - The return type for the generateFunnyNewsHeadline function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFunnyNewsHeadlineInputSchema = z.object({
  stockTicker: z.string().describe('The stock ticker symbol.'),
  companyName: z.string().describe('The name of the company/nickname of the person.'),
  description: z.string().describe('The AI-generated description of the person.'),
  currentValue: z.number().describe('The current stock value.'),
  change: z.number().describe('The change in stock value over the session.'),
  percentChange: z.number().describe('The percentage change in stock value over the session.'),
});
export type GenerateFunnyNewsHeadlineInput = z.infer<
  typeof GenerateFunnyNewsHeadlineInputSchema
>;

const GenerateFunnyNewsHeadlineOutputSchema = z.object({
  headline: z.string().describe('A funny news headline.'),
});
export type GenerateFunnyNewsHeadlineOutput = z.infer<
  typeof GenerateFunnyNewsHeadlineOutputSchema
>;

export async function generateFunnyNewsHeadline(
  input: GenerateFunnyNewsHeadlineInput
): Promise<GenerateFunnyNewsHeadlineOutput> {
  return generateFunnyNewsHeadlineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFunnyNewsHeadlinePrompt',
  input: {schema: GenerateFunnyNewsHeadlineInputSchema},
  output: {schema: GenerateFunnyNewsHeadlineOutputSchema},
  prompt: `You are a financial news editor with a sarcastic, dark sense of humor for a stock market simulation party game with the theme "Geld. Macht. Schön." (Money. Power. Beauty.).

  Based on the following information, generate a funny, ironic, and engaging news headline about a person's stock profile. The tone should be witty and slightly cynical, fitting the theme.

  Stock Ticker: {{{stockTicker}}}
  Nickname: {{{companyName}}}
  Profile Description: {{{description}}}
  Current Value: \${{{currentValue}}}
  Session Change: \${{{change}}} ({{{percentChange}}}%)

  Generate a headline. Be creative and sharp.`,
});

const generateFunnyNewsHeadlineFlow = ai.defineFlow(
  {
    name: 'generateFunnyNewsHeadlineFlow',
    inputSchema: GenerateFunnyNewsHeadlineInputSchema,
    outputSchema: GenerateFunnyNewsHeadlineOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
