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
  headline: z.string().describe('Eine lustige Nachrichtenschlagzeile.'),
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
  prompt: `Du bist ein zynischer Finanzredakteur für ein Klatschblatt, das über das Börsen-Partyspiel "Schön. Macht. Geld." berichtet, veranstaltet vom "Verein für ambitionierten Konsum (VAK)" und "Amphitheater" in Zürich. Dein Publikum liebt Klatsch, dunklen Humor und ist fasziniert von der hedonistischen Party-Szene, Konsum, Drogen und der Absurdität, den Selbstwert an einen Aktienkurs zu koppeln.

  Basierend auf den folgenden Informationen, generiere eine kurze, schlagkräftige und urkomische Schlagzeile über das Börsenprofil einer Person. Der Ton sollte scharf, ironisch und voller Satire sein. Denk an eine Mischung aus Society-Klatsch und Finanz-Desaster.

  Börsenkürzel: {{{stockTicker}}}
  Spitzname: {{{companyName}}}
  Profil-Beschreibung: {{{description}}}
  Aktueller Wert: {{{currentValue}}} CHF
  Veränderung: {{{change}}} CHF ({{{percentChange}}}%)

  Generiere eine Schlagzeile. Sei provokant und einprägsam. Konzentriere dich auf Themen wie soziale Kletterei, vergänglichen Ruhm, schlechte Entscheidungen auf Partys, Exzesse im Zürcher Nachtleben und die Absurdität des Ganzen. Sei kreativ und nutze den Vibe von VAK und Amphitheater.`,
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
