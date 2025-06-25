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
        openingReading: z.number().describe("The opening meter reading for the nozzle for the **entire period** (e.g., for the month)."),
        closingReading: z.number().describe("The closing meter reading for the nozzle for the **entire period** (e.g., for the month)."),
        testing: z.number().describe("The total amount of fuel used for testing in litres over the period.").default(0),
    })).describe("An array containing **all** meter readings for each fuel nozzle for the entire month."),
    lubricantSales: z.number().describe("The total sales value of lubricants for the entire month.").default(0),
    creditSales: z.number().describe("The total amount of sales made on credit (udhaar) for the entire month."),
    phonepeSales: z.number().describe("The total amount of money collected specifically via PhonePe during the month.").default(0),
    bankDeposits: z.array(z.object({
        description: z.string().describe("A brief description of the deposit, e.g., 'Cash Deposit', 'Card Swipes', 'Google Pay'. Do not include PhonePe here."),
        amount: z.number().describe("The amount of the deposit."),
        destinationAccount: z.string().describe("The name of the bank or account where the money was deposited, e.g., 'SBI'").optional(),
    })).describe("An array of all bank deposits made during the month, **excluding PhonePe transactions**."),
    cashInHand: z.number().describe("The final net cash collected or in hand at the end of the month, after accounting for all sales, credit, and deposits.").default(0),
});
export type AnalyzeDsrOutput = z.infer<typeof AnalyzeDsrOutputSchema>;


export async function analyzeDsr(input: AnalyzeDsrInput): Promise<AnalyzeDsrOutput> {
  return analyzeDsrFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDsrPrompt',
  input: {schema: AnalyzeDsrInputSchema},
  output: {schema: AnalyzeDsrOutputSchema},
  prompt: `You are an expert financial analyst for an Indian petrol station. Your task is to analyze the provided Monthly Sales Report PDF with extreme accuracy and extract key financial data.

The report covers a full month of operations. You must populate all fields in the output JSON.

- **reportDate**: This is a monthly report. Find the **end date** of the reporting period and format it as YYYY-MM-DD.

- **fuelSales**: This is the most critical section. Find the table with meter readings for every fuel nozzle.
  - You must extract the opening reading for the **start of the month** and the closing reading for the **end of the month** for EACH nozzle.
  - Identify the fuel type (e.g., 'Petrol', 'Diesel'), its price per litre, the nozzle number, and the total 'testing' volume for the month.
  - Ensure you capture data for **all nozzles** listed in the report.

- **lubricantSales**: Look for a specific section or line item detailing "Lube Sales" or "Lubricant Sales". Extract the total sales amount for the month. If not mentioned, return 0.

- **creditSales**: Find the total amount of sales made on credit (udhaar) for the entire month.

- **phonepeSales**: Locate the total amount of money collected specifically via PhonePe. This is a distinct value.

- **bankDeposits**: Find all other cash collections and deposits into banks. This includes cash deposits, card swipes, Google Pay, etc., but **DO NOT include PhonePe sales here**. Create an entry for each distinct deposit.

- **cashInHand**: Find the final figure for "Cash In Hand", "Net Cash", or "Cash Collection". This represents the physical cash remaining after all sales and deposits.

Return the extracted information precisely in the specified JSON format. Be meticulous.

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
