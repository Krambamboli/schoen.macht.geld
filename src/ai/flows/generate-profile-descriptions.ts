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
  prompt: `Du bist ein kreativer Marketing-Spezialist, der witzige und bissige Profilbeschreibungen für das Börsensimulationsspiel "Schön. Macht. Geld." erstellt. Das Spiel findet im Rahmen einer exzessiven Party statt, die vom "Verein für ambitionierten Konsum (VAK)" und dem Club "Amphitheater" in Zürich veranstaltet wird. Das Motto ist hedonistischer Konsum, Macht und Schönheit.

  Generiere eine Profilbeschreibung für den Benutzer basierend auf seinem Spitznamen und seinem Foto.

  Spitzname: {{{nickname}}}
  Foto: {{media url=photoDataUri}}

  Die Beschreibung sollte sarkastisch, ironisch und auf Deutsch sein. Sie soll das Thema "Schön. Macht. Geld." und den Vibe des Zürcher Nachtlebens, Konsum und der Party-Exzesse widerspiegeln. Die Beschreibung darf nicht mehr als 100 Wörter umfassen. Sei kreativ und spiele mit Klischees.`,
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
