
'use server';
/**
 * @fileOverview An AI flow for analyzing Daily Sales Reports to extract daily data.
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
      "A PDF or CSV of a Sales Report, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeDsrInput = z.infer<typeof AnalyzeDsrInputSchema>;


const DailyMeterReadingSchema = z.object({
    fuelName: z.string().describe("Name of the fuel, e.g., 'Petrol', 'Diesel'. Match it to standard names like 'MS', 'HSD', 'XP95' etc."),
    nozzleId: z.number().describe("The nozzle number, starting from 1 for each fuel type."),
    openingReading: z.number().describe("The opening meter reading for the nozzle for that specific day."),
    closingReading: z.number().describe("The closing meter reading for the nozzle for that specific day."),
    testing: z.number().describe("The amount of fuel used for testing in litres for that day.").default(0),
});

const DailyReportDataSchema = z.object({
    date: z.string().describe("The date of the report entry in YYYY-MM-DD format."),
    meterReadings: z.array(DailyMeterReadingSchema),
    lubricantSales: z.number().describe("The total sales value of lubricants for that day.").default(0),
    creditSales: z.number().describe("The total amount of sales made on credit (udhaar) for that day.").default(0),
    phonepeSales: z.number().describe("The total amount of money collected specifically via PhonePe for that day.").default(0),
    cashDeposited: z.number().describe("The total amount deposited to the bank for that day (from the 'Cash' column).").default(0),
});

const AnalyzeDsrOutputSchema = z.array(DailyReportDataSchema);
export type AnalyzeDsrOutput = z.infer<typeof AnalyzeDsrOutputSchema>;


export async function analyzeDsr(input: AnalyzeDsrInput): Promise<AnalyzeDsrOutput> {
  return analyzeDsrFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDsrPrompt',
  input: {schema: AnalyzeDsrInputSchema},
  output: {schema: AnalyzeDsrOutputSchema},
  prompt: `You are an expert data entry assistant for an Indian petrol station. Your task is to analyze the provided sales report and extract a list of **daily transactions**.

The input is a table (PDF or CSV) where each row represents a single day's sales data.

**Analysis Instructions:**

- **Iterate through each row** of the report table. Each row corresponds to a single day.
- For each day, extract the following information:
    - **\`date\`**: The date for that row, formatted as YYYY-MM-DD.
    - **\`meterReadings\`**:
        - The report has columns for opening and closing readings for different fuels (e.g., 'XP', 'MS', 'HSD'). A fuel like 'HSD' might have multiple columns; treat each column as a separate nozzle (e.g., HSD Nozzle 1, HSD Nozzle 2).
        - For each nozzle, extract the opening reading, closing reading, and any testing amount for that specific day.
    - **\`lubricantSales\`**: The value from the 'Lubricant' column for that day.
    - **\`creditSales\`**: The value from the 'Credit' column for that day.
    - **\`phonepeSales\`**: The value from the 'Phonepe' column for that day.
    - **\`cashDeposited\`**: The value from the 'Cash' column for that day.

Return the extracted information as a JSON array, where each object in the array represents a single day's complete data. Ignore any rows that do not contain valid daily sales data.

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
