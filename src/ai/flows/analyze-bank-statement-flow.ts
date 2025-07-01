'use server';
/**
 * @fileOverview An AI flow for analyzing bank statements.
 *
 * - analyzeBankStatement - A function that handles the bank statement analysis.
 * - AnalyzeBankStatementInput - The input type for the analyzeBankStatement function.
 * - AnalyzeBankStatementOutput - The return type for the analyzeBankStatement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeBankStatementInputSchema = z.object({
  statementDataUri: z
    .string()
    .describe(
      "An image or PDF of a bank statement, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeBankStatementInput = z.infer<typeof AnalyzeBankStatementInputSchema>;

const AnalyzedTransactionSchema = z.object({
    date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
    description: z.string().describe("A brief description of the transaction."),
    amount: z.number().describe("The transaction amount as a positive number."),
    type: z.enum(['credit', 'debit']).describe("The type of transaction: 'credit' for deposits, 'debit' for withdrawals."),
});

const AnalyzeBankStatementOutputSchema = z.array(AnalyzedTransactionSchema);
export type AnalyzeBankStatementOutput = z.infer<typeof AnalyzeBankStatementOutputSchema>;

export async function analyzeBankStatement(input: AnalyzeBankStatementInput): Promise<AnalyzeBankStatementOutput> {
  return analyzeBankStatementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeBankStatementPrompt',
  input: {schema: AnalyzeBankStatementInputSchema},
  output: {schema: AnalyzeBankStatementOutputSchema},
  prompt: `You are an expert financial assistant. Your task is to analyze the provided bank statement image or document and extract all transactions.

For each transaction, identify the date, a clear description, the amount, and whether it is a credit (deposit) or a debit (withdrawal).

- The date must be in YYYY-MM-DD format.
- The amount must be a positive number.
- The type must be either 'credit' or 'debit'.

Return the extracted information as a JSON array of transaction objects.

Bank Statement Photo: {{media url=statementDataUri}}`,
});

const analyzeBankStatementFlow = ai.defineFlow(
  {
    name: 'analyzeBankStatementFlow',
    inputSchema: AnalyzeBankStatementInputSchema,
    outputSchema: AnalyzeBankStatementOutputSchema,
  },
  async (input) => {
    const maxRetries = 3;
    const initialDelay = 1000;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const {output} = await prompt(input);
            return output || [];
        } catch (err: any) {
            lastError = err;
            if (err.message && (err.message.includes('503') || err.message.toLowerCase().includes('overloaded'))) {
                console.log(`Attempt ${i + 1} failed due to model overload. Retrying in ${initialDelay * (i + 1)}ms...`);
                await new Promise(resolve => setTimeout(resolve, initialDelay * (i + 1)));
            } else {
                throw err;
            }
        }
    }
    throw new Error(`AI analysis failed after ${maxRetries} attempts. The service may be temporarily unavailable. Last error: ${lastError?.message || 'Unknown error'}`);
  }
);
