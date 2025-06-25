'use server';
/**
 * @fileOverview An AI flow for analyzing Daily Sales Reports (DSR).
 *
 * - analyzeDsr - A function that handles the DSR analysis.
 * - AnalyzeDsrInput - The input type for the analyzeDsr function.
 * - AnalyzeDsrOutput - The return type for the analyzeDsr function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDsrInputSchema = z.object({
  dsrDataUri: z
    .string()
    .describe(
      "A PDF of a Daily Sales Report, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeDsrInput = z.infer<typeof AnalyzeDsrInputSchema>;

const AnalyzeDsrOutputSchema = z.object({
    reportDate: z.string().describe("The date of the sales report in YYYY-MM-DD format."),
    fuelSales: z.array(z.object({
        fuelName: z.string().describe("Name of the fuel, e.g., 'Petrol', 'Diesel'. Match it to standard names."),
        pricePerLitre: z.coerce.number().describe("The selling price per litre for this fuel on the report date."),
        nozzleId: z.number().describe("The nozzle number."),
        openingReading: z.number().describe("The opening meter reading for the nozzle."),
        closingReading: z.number().describe("The closing meter reading for the nozzle."),
        testing: z.number().describe("The amount of fuel used for testing in litres.").default(0),
    })).describe("An array of all meter readings for each fuel nozzle."),
    creditSales: z.number().describe("The total amount of sales made on credit."),
    bankDeposits: z.array(z.object({
        description: z.string().describe("A brief description of the deposit, e.g., 'PhonePe Collection', 'Card Swipes'."),
        amount: z.number().describe("The amount of the deposit."),
        destinationAccount: z.string().describe("The name of the bank or account where the money was deposited, e.g., 'SBI'").optional(),
    })).describe("An array of all bank deposits made."),
});
export type AnalyzeDsrOutput = z.infer<typeof AnalyzeDsrOutputSchema>;


export async function analyzeDsr(input: AnalyzeDsrInput): Promise<AnalyzeDsrOutput> {
  return analyzeDsrFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDsrPrompt',
  input: {schema: AnalyzeDsrInputSchema},
  output: {schema: AnalyzeDsrOutputSchema},
  prompt: `You are an expert financial assistant for a petrol station. Your task is to analyze the provided Daily Sales Report (DSR) and extract key financial and operational data with extreme accuracy.

The DSR is provided as a PDF document. Analyze it carefully and populate all fields in the output JSON.

- **reportDate**: Extract the date of the report and format it as YYYY-MM-DD.
- **fuelSales**: Find the section with meter readings for each fuel nozzle.
  - For each nozzle, extract the fuel type ('Petrol', 'Diesel', etc.), its selling price per litre, the nozzle number, the opening meter reading, and the closing meter reading.
  - Also, look for any 'testing' volume and record it. If none is mentioned, assume 0.
- **creditSales**: Find the total amount of sales that were made on credit (udhaar).
- **bankDeposits**: Locate all cash collections and deposits into the bank. This could include cash, PhonePe, Google Pay, or card swipe collections.
  - For each separate deposit, create an object with a clear description (e.g., "PhonePe Collection"), the amount, and the destination bank if mentioned (e.g., "SBI").

Return the extracted information precisely in the specified JSON format.

Daily Sales Report: {{media url=dsrDataUri}}`,
});

const analyzeDsrFlow = ai.defineFlow(
  {
    name: 'analyzeDsrFlow',
    inputSchema: AnalyzeDsrInputSchema,
    outputSchema: AnalyzeDsrOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI analysis failed to produce a valid output.");
    }
    return output;
  }
);
