'use server';
/**
 * @fileOverview An AI flow for analyzing Monthly Sales Reports.
 *
 * - analyzeDsr - A function that handles the sales report analysis.
 * - AnalyzeDsrInput - The input type for the analyzeDsr function.
 * - AnalyzeDsrOutput - The return type for the analyzeDsr function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDsrInputSchema = z.object({
  dsrDataUri: z
    .string()
    .describe(
      "A PDF of a Monthly Sales Report, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeDsrInput = z.infer<typeof AnalyzeDsrInputSchema>;

const AnalyzeDsrOutputSchema = z.object({
    reportDate: z.string().describe("The **end date** of the sales report period in YYYY-MM-DD format. Find the latest date mentioned in the report."),
    fuelSales: z.array(z.object({
        fuelName: z.string().describe("Name of the fuel, e.g., 'Petrol', 'Diesel'. Match it to standard names."),
        pricePerLitre: z.coerce.number().describe("The average or final selling price per litre for this fuel during the report period."),
        nozzleId: z.number().describe("The nozzle number."),
        openingReading: z.number().describe("The opening meter reading for the nozzle for the entire period."),
        closingReading: z.number().describe("The closing meter reading for the nozzle for the entire period."),
        testing: z.number().describe("The total amount of fuel used for testing in litres over the period.").default(0),
    })).describe("An array of all meter readings for each fuel nozzle for the entire month."),
    creditSales: z.number().describe("The total amount of sales made on credit for the entire month."),
    bankDeposits: z.array(z.object({
        description: z.string().describe("A brief description of the deposit, e.g., 'PhonePe Collection', 'Card Swipes'."),
        amount: z.number().describe("The amount of the deposit."),
        destinationAccount: z.string().describe("The name of the bank or account where the money was deposited, e.g., 'SBI'").optional(),
    })).describe("An array of all bank deposits made during the month."),
});
export type AnalyzeDsrOutput = z.infer<typeof AnalyzeDsrOutputSchema>;


export async function analyzeDsr(input: AnalyzeDsrInput): Promise<AnalyzeDsrOutput> {
  return analyzeDsrFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDsrPrompt',
  input: {schema: AnalyzeDsrInputSchema},
  output: {schema: AnalyzeDsrOutputSchema},
  prompt: `You are an expert financial assistant for a petrol station. Your task is to analyze the provided Monthly Sales Report and extract key financial and operational data with extreme accuracy.

The report is provided as a PDF document. Analyze it carefully and populate all fields in the output JSON.

- **reportDate**: This is a monthly report. You must find the **end date** of the reporting period and format it as YYYY-MM-DD.
- **fuelSales**: Find the section with meter readings for each fuel nozzle. The readings will represent the whole month's activity.
  - For each nozzle, extract the fuel type ('Petrol', 'Diesel', etc.), its average or final selling price per litre, the nozzle number, the opening meter reading **for the month**, and the closing meter reading **for the month**.
  - Also, look for the total 'testing' volume for the month and record it. If none is mentioned, assume 0.
- **creditSales**: Find the total amount of sales that were made on credit (udhaar) for the entire month.
- **bankDeposits**: Locate all cash collections and deposits into the bank for the month. This could include cash, PhonePe, Google Pay, or card swipe collections.
  - For each separate deposit, create an object with a clear description (e.g., "PhonePe Collection"), the amount, and the destination bank if mentioned (e.g., "SBI").

Return the extracted information precisely in the specified JSON format.

Monthly Sales Report: {{media url=dsrDataUri}}`,
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
