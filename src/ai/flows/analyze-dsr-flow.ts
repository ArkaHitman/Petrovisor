
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
      "A PDF or CSV of a Monthly Sales Report, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeDsrInput = z.infer<typeof AnalyzeDsrInputSchema>;

const AnalyzeDsrOutputSchema = z.object({
    reportDate: z.string().describe("The **end date** of the sales report period in YYYY-MM-DD format. Find the latest date mentioned in the report."),
    fuelSales: z.array(z.object({
        fuelName: z.string().describe("Name of the fuel, e.g., 'Petrol', 'Diesel'. Match it to standard names like 'MS', 'HSD', 'XP95' etc."),
        pricePerLitre: z.coerce.number().describe("The selling price per litre for this fuel during the report period, extracted from the document header."),
        nozzleId: z.number().describe("The nozzle number, starting from 1 for each fuel type."),
        openingReading: z.number().describe("The opening meter reading for the nozzle on the **first day** of the report."),
        closingReading: z.number().describe("The closing meter reading for the nozzle on the **last day** of the report."),
        testing: z.number().describe("The total amount of fuel used for testing in litres over the period, summed from all days.").default(0),
    })).describe("An array containing the meter readings for each fuel nozzle, summarizing the entire month."),
    lubricantSales: z.number().describe("The total sales value of lubricants for the entire month, calculated by summing the 'Lubricant' column."),
    creditSales: z.number().describe("The total amount of sales made on credit (udhaar) for the entire month, calculated by summing the 'Credit' column."),
    phonepeSales: z.number().describe("The total amount of money collected specifically via PhonePe during the month, calculated by summing the 'Phonepe' column."),
    bankDeposits: z.array(z.object({
        description: z.string().describe("A brief description of the deposit."),
        amount: z.number().describe("The total amount of the deposit for the month."),
        destinationAccount: z.string().describe("The name of the bank or account where the money was deposited, e.g., 'SBI'").optional(),
    })).describe("An array of bank deposits. For daily reports, this should contain a single entry representing the sum of the 'Cash' column, with the description 'Total Cash Deposits for the Month'."),
    cashInHand: z.number().describe("The final net cash collected or in hand at the end of the month. This should be the grand total of the 'Cash' column at the bottom of the report."),
});
export type AnalyzeDsrOutput = z.infer<typeof AnalyzeDsrOutputSchema>;


export async function analyzeDsr(input: AnalyzeDsrInput): Promise<AnalyzeDsrOutput> {
  return analyzeDsrFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDsrPrompt',
  input: {schema: AnalyzeDsrInputSchema},
  output: {schema: AnalyzeDsrOutputSchema},
  prompt: `You are an expert financial analyst for an Indian petrol station. Your task is to analyze the provided sales report and produce a **single monthly summary** in the required JSON format.

The input can be one of two formats:
1.  A **Daily Sales Report (DSR)** table with a row for each day of the month.
2.  A **structured CSV file** with specific sections: [REPORT_INFO], [FUEL_SALES], and [BANK_DEPOSITS].

**Analysis Instructions:**

If the input is a **Daily Sales Report (DSR) in a table format**:
-   **reportDate**: Find the **end date** of the reporting period (the last date in the date column) and format it as YYYY-MM-DD.
-   **fuelSales**: This is a monthly summary.
    -   First, extract the fuel prices per litre from the document's header (e.g., MS@101.46).
    -   The report table has columns for opening and closing readings for different fuels (e.g., 'XP', 'MS', 'HSD'). A fuel like 'HSD' might have multiple columns; treat each column as a separate nozzle for that fuel (e.g., HSD Nozzle 1, HSD Nozzle 2).
    -   For **each nozzle**, you must extract the **opening reading from the first day** of the month and the **closing reading from the last day** of the month.
    -   Populate the \`fuelSales\` array with one object for each nozzle identified.
-   **lubricantSales**: Calculate the total by summing the entire 'Lubricant' column.
-   **creditSales**: Calculate the total by summing the entire 'Credit' column.
-   **phonepeSales**: Calculate the total by summing the entire 'Phonepe' column.
-   **bankDeposits**: Calculate the total by summing the entire 'Cash' column. Create a **single entry** in the \`bankDeposits\` array with the description "Total Cash Deposits for the Month" and this total amount.
-   **cashInHand**: Extract the grand total from the bottom of the 'Cash' column. If it is not available, calculate it as (Total of 'Total Sale' column) - (Total of 'Credit' column) - (Total of 'Phonepe' column).

If the input is a **structured CSV**:
-   **[REPORT_INFO]**: Parse the key-value pairs. Find 'Report End Date (YYYY-MM-DD)' for the \`reportDate\` field. Extract \`lubricantSales\`, \`creditSales\`, \`phonepeSales\`, and \`cashInHand\` from their respective keys.
-   **[FUEL_SALES]**: Read each row in this section and create an entry in the \`fuelSales\` output array.
-   **[BANK_DEPOSITS]**: Read each row in this section and create an entry in the \`bankDeposits\` output array.


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
