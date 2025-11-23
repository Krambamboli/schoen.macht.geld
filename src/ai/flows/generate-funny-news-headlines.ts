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
  companyName: z.string().describe('The name of the company.'),
  currentValue: z.number().describe('The current stock value.'),
  swipeSentiment: z
    .string()
    .describe(
      'General swipe sentiment - number of swipes left vs right, e.g. positive or negative or neutral'
    ),
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
  prompt: `You are a financial news editor with a sarcastic sense of humor.

  Based on the following information, generate a funny and engaging news headline about a stock:

  Stock Ticker: {{{stockTicker}}}
  Company Name: {{{companyName}}}
  Current Value: {{{currentValue}}}
  General Swipe Sentiment: {{{swipeSentiment}}}

  Headline:`,
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
