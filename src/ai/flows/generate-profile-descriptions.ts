'use server';

/**
 * @fileOverview A profile description generator AI agent.
 *
 * - generateProfileDescription - A function that handles the profile description generation process.
 * - GenerateProfileDescriptionInput - The input type for the generateProfileDescription function.
 * - GenerateProfileDescriptionOutput - The return type for the generateProfileDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProfileDescriptionInputSchema = z.object({
  nickname: z.string().describe('The nickname of the user.'),
  photoDataUri: z
    .string()
    .describe(
      "A photo of the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateProfileDescriptionInput = z.infer<typeof GenerateProfileDescriptionInputSchema>;

const GenerateProfileDescriptionOutputSchema = z.object({
  description: z.string().describe('Die generierte Profilbeschreibung.'),
});
export type GenerateProfileDescriptionOutput = z.infer<typeof GenerateProfileDescriptionOutputSchema>;

export async function generateProfileDescription(
  input: GenerateProfileDescriptionInput
): Promise<GenerateProfileDescriptionOutput> {
  return generateProfileDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProfileDescriptionPrompt',
  input: {schema: GenerateProfileDescriptionInputSchema},
  output: {schema: GenerateProfileDescriptionOutputSchema},
  prompt: `Du bist ein Ghostwriter für die exzessive Zürcher Partyszene und schreibst witzige, bissige "Börsenprospekte" in der Ich-Perspektive für das Partyspiel "Schön. Macht. Geld.". Das Spiel wird vom "Verein für ambitionierten Konsum (VAK)" und dem Club "Amphitheater" veranstaltet. Das Motto: hedonistischer Konsum, Macht, Schönheit und Drogen.

  Schreibe eine sarkastische, ironische und prahlerische Profilbeschreibung in der Ich-Form, basierend auf dem Spitznamen und dem Foto der Person.

  Spitzname: {{{nickname}}}
  Foto: {{media url=photoDataUri}}

  Regeln:
  1.  **Perspektive:** Schreibe immer aus der Ich-Perspektive.
  2.  **Ton:** Selbstverliebt, sarkastisch, satirisch. Mische Finanzjargon mit Party-Slang.
  3.  **Themen:** Spiele mit Klischees über das Zürcher Nachtleben, Konsum, Status, Oberflächlichkeit und Exzesse.
  4
  .  **Länge:** Maximal 350 Zeichen (inkl. Leerzeichen).
  5.  **Sprache:** Deutsch.

  Beispiel: "Mein Kurs? Steigt schneller als mein Puls nach der dritten Line. Ich bin keine Aktie, ich bin ein Gerücht, eine Legende auf dem Zürcher Parkett. Investier jetzt, bevor ich zu teuer für dein kleines Portfolio werde."`,
});

const generateProfileDescriptionFlow = ai.defineFlow(
  {
    name: 'generateProfileDescriptionFlow',
    inputSchema: GenerateProfileDescriptionInputSchema,
    outputSchema: GenerateProfileDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
