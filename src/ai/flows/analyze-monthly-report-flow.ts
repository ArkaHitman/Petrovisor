'use server';
/**
 * @fileOverview An AI flow for analyzing monthly sales reports.
 *
 * - analyzeMonthlyReport - A function that handles the sales report analysis.
 * - AnalyzeMonthlyReportInput - The input type for the analyzeMonthlyReport function.
 * - AnalyzeMonthlyReportOutput - The return type for the analyzeMonthlyReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeMonthlyReportInputSchema = z.object({
  reportDataUri: z
    .string()
    .describe(
      "A PDF or Excel file of a Monthly Sales Report, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeMonthlyReportInput = z.infer<typeof AnalyzeMonthlyReportInputSchema>;

const MeterReadingSchema = z.object({
    fuelName: z.string().describe("Name of the fuel, e.g., 'Petrol', 'Diesel'. Match it to standard names like 'MS', 'HSD', 'XP95' etc."),
    nozzleId: z.number().describe("The nozzle number, starting from 1 for each fuel type."),
    openingReading: z.number().describe("The opening meter reading for the nozzle for the month."),
    closingReading: z.number().describe("The closing meter reading for the nozzle for the month."),
    testing: z.number().describe("The total amount of fuel used for testing in litres for the month.").default(0),
});

const AnalyzeMonthlyReportOutputSchema = z.object({
    endDate: z.string().describe("The end date of the report period in YYYY-MM-DD format."),
    fuelReadings: z.array(MeterReadingSchema),
    lubricantSales: z.number().describe("The total sales value of lubricants for the month.").default(0),
    creditSales: z.number().describe("The total amount of sales made on credit for the month.").default(0),
    bankDeposits: z.number().describe("The total amount of cash deposited to the bank for the month.").default(0),
});
export type AnalyzeMonthlyReportOutput = z.infer<typeof AnalyzeMonthlyReportOutputSchema>;

export async function analyzeMonthlyReport(input: AnalyzeMonthlyReportInput): Promise<AnalyzeMonthlyReportOutput> {
  return analyzeMonthlyReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeMonthlyReportPrompt',
  input: {schema: AnalyzeMonthlyReportInputSchema},
  output: {schema: AnalyzeMonthlyReportOutputSchema},
  prompt: `You are an expert data entry assistant for an Indian petrol station. Your task is to analyze the provided monthly sales report and extract the key figures for the entire period.

The input is a table (PDF or Excel) that summarizes sales over a month.

**Analysis Instructions:**
- **\`endDate\`**: Find the end date of the report period and format it as YYYY-MM-DD.
- **\`fuelReadings\`**:
    - The report has columns for opening and closing readings for different fuels (e.g., 'XP', 'MS', 'HSD'). A fuel might have multiple nozzles.
    - For each nozzle, extract the opening reading, closing reading, and any testing amount for the entire month.
- **\`lubricantSales\`**: The total value from the 'Lubricant' or similar column for the month.
- **\`creditSales\`**: The total value from the 'Credit' or 'Udhaar' column for the month.
- **\`bankDeposits\`**: The total amount of cash deposited to the bank during the month.

Return the extracted information as a single JSON object.

Monthly Sales Report: {{media url=reportDataUri}}`,
});

const analyzeMonthlyReportFlow = ai.defineFlow(
  {
    name: 'analyzeMonthlyReportFlow',
    inputSchema: AnalyzeMonthlyReportInputSchema,
    outputSchema: AnalyzeMonthlyReportOutputSchema,
  },
  async (input) => {
    const maxRetries = 3;
    const initialDelay = 1000;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const {output} = await prompt(input);
            if (!output) {
                throw new Error("AI analysis failed to produce a valid output from the monthly report.");
            }
            return output;
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
