'use server';

/**
 * @fileOverview Generates a batch of funny news headlines for trending stocks.
 *
 * - generateFunnyNewsHeadlinesBatch - A function that generates 5 funny news headlines.
 * - GenerateFunnyNewsHeadlinesBatchInput - The input type for the function.
 * - GenerateFunnyNewsHeadlinesBatchOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the shape of a single stock for the input
const StockInputSchema = z.object({
  stockTicker: z.string().describe('The stock ticker symbol.'),
  companyName: z.string().describe('The name of the company/nickname of the person.'),
  description: z.string().describe('The AI-generated description of the person.'),
  currentValue: z.number().describe('The current stock value.'),
  change: z.number().describe('The change in stock value over the session.'),
  percentChange: z.number().describe('The percentage change in stock value over the session.'),
});

export const GenerateFunnyNewsHeadlinesBatchInputSchema = z.object({
    stocks: z.array(StockInputSchema).describe('An array of the top 5 trending stocks.')
});
export type GenerateFunnyNewsHeadlinesBatchInput = z.infer<
  typeof GenerateFunnyNewsHeadlinesBatchInputSchema
>;

const GenerateFunnyNewsHeadlinesBatchOutputSchema = z.object({
  headlines: z.array(z.string().describe('Eine einzelne, lustige Nachrichtenschlagzeile.')).length(5),
});
export type GenerateFunnyNewsHeadlinesBatchOutput = z.infer<
  typeof GenerateFunnyNewsHeadlinesBatchOutputSchema
>;

export async function generateFunnyNewsHeadlinesBatch(
  input: GenerateFunnyNewsHeadlinesBatchInput
): Promise<GenerateFunnyNewsHeadlinesBatchOutput> {
  return generateFunnyNewsHeadlinesBatchFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFunnyNewsHeadlinesBatchPrompt',
  input: {schema: GenerateFunnyNewsHeadlinesBatchInputSchema},
  output: {schema: GenerateFunnyNewsHeadlinesBatchOutputSchema},
  prompt: `Du bist ein zynischer Finanzredakteur für ein Klatschblatt, das über das Börsen-Partyspiel "Schön. Macht. Geld." berichtet, veranstaltet vom "Verein für ambitionierten Konsum (VAK)" und "Amphitheater" in Zürich. Dein Publikum liebt Klatsch, dunklen Humor und ist fasziniert von der hedonistischen Party-Szene, Konsum, Drogen und der Absurdität, den Selbstwert an einen Aktienkurs zu koppeln.

  Basierend auf den folgenden Informationen über die 5 volatilsten Aktien, generiere ein Set von genau 5 kurzen, schlagkräftigen und urkomischen Schlagzeilen. Jede Schlagzeile sollte für sich stehen. Der Ton sollte scharf, ironisch und voller Satire sein. Denk an eine Mischung aus Society-Klatsch und Finanz-Desaster.

  Achte auf korrekte deutsche Rechtschreibung und die korrekte Verwendung von Umlauten (ä, ö, ü).

  Hier sind die Daten der Top-Aktien:
  {{#each stocks}}
  - Börsenkürzel: {{{this.stockTicker}}}, Spitzname: {{{this.companyName}}}, Aktueller Wert: {{{this.currentValue}}} CHF, Veränderung: {{{this.change}}} CHF ({{{this.percentChange}}}%)
  {{/each}}

  Generiere 5 einzigartige Schlagzeilen. Sei provokant und einprägsam. Konzentriere dich auf Themen wie soziale Kletterei, vergänglichen Ruhm, schlechte Entscheidungen auf Partys, Exzesse im Zürcher Nachtleben und die Absurdität des Ganzen. Sei kreativ und nutze den Vibe von VAK und Amphitheater.`,
});

const generateFunnyNewsHeadlinesBatchFlow = ai.defineFlow(
  {
    name: 'generateFunnyNewsHeadlinesBatchFlow',
    inputSchema: GenerateFunnyNewsHeadlinesBatchInputSchema,
    outputSchema: GenerateFunnyNewsHeadlinesBatchOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
