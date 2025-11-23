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
  description: z.string().describe('The generated profile description.'),
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
  prompt: `You are a creative marketing specialist tasked with creating funny and engaging profile descriptions for a stock market simulation game with the theme \"Geld. Macht. Sch\u00f6n.\" (Money. Power. Beauty.).

  Generate a profile description for the user based on their nickname and photo.

  Nickname: {{{nickname}}}
  Photo: {{media url=photoDataUri}}

  The description should be sarcastic, ironic, and reflect the theme of \"Geld. Macht. Sch\u00f6n.\".  It should be no more than 100 words.
`,
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
