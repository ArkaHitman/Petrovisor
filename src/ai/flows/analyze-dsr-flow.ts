
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
    nozzleId: z.coerce.number().describe("The nozzle number, starting from 1 for each fuel type."),
    openingReading: z.coerce.number().describe("The opening meter reading for the nozzle for that specific day."),
    closingReading: z.coerce.number().describe("The closing meter reading for the nozzle for that specific day."),
    testing: z.coerce.number().describe("The amount of fuel used for testing in litres for that day.").default(0),
});

const DailyReportDataSchema = z.object({
    date: z.string().describe("The date of the report entry in YYYY-MM-DD format."),
    meterReadings: z.array(DailyMeterReadingSchema),
    lubricantSales: z.coerce.number().describe("The total sales value of lubricants for that day.").default(0),
    creditSales: z.coerce.number().describe("The total amount of sales made on credit (udhaar) for that day.").default(0),
    phonepeSales: z.coerce.number().describe("The total amount of money collected specifically via PhonePe for that day.").default(0),
    cashDeposited: z.coerce.number().describe("The total amount deposited to the bank for that day (from the 'Cash' column).").default(0),
});

const AnalyzeDsrOutputSchema = z.array(DailyReportDataSchema);
export type AnalyzeDsrOutput = z.infer<typeof AnalyzeDsrOutputSchema>;


export async function analyzeDsr(input: AnalyzeDsrInput): Promise<AnalyzeDsrOutput> {
  return analyzeDsrFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDsrPrompt',
  input: {schema: AnalyzeDsrInputSchema},
  output: { format: 'json' }, // Use lax format validation to allow for manual sanitation
  prompt: `You are an expert data entry assistant for an Indian petrol station. Your task is to analyze the provided sales report and extract a list of **daily transactions**.

The input is a table (PDF or CSV) where each row represents a single day's sales data.

**Analysis Instructions:**

- **Iterate through each row** of the report table. Each row corresponds to a single day.
- For each day, extract the following information:
    - **\`date\`**: The date for that row, formatted as YYYY-MM-DD.
    - **\`meterReadings\`**:
        - The report has columns for opening and closing readings for different fuels (e.g., 'XP', 'MS', 'HSD'). A fuel like 'HSD' might have multiple columns; treat each column as a separate nozzle (e.g., HSD Nozzle 1, HSD Nozzle 2).
        - For each nozzle, extract the opening reading, closing reading, and any testing amount for that specific day. Ensure every reading has 'fuelName', 'nozzleId', 'openingReading', and 'closingReading'.
    - **\`lubricantSales\`**: The value from the 'Lubricant' column for that day.
    - **\`creditSales\`**: The value from the 'Credit' column for that day.
    - **\`phonepeSales\`**: The value from the 'Phonepe' column for that day.
    - **\`cashDeposited\`**: The value from the 'Cash' column for that day.

Return the extracted information as a JSON array, where each object in the array represents a single day's complete data. Ignore any rows or meter readings that do not contain valid data.

Monthly Sales Report: {{media url=dsrDataUri}}`,
});

const analyzeDsrFlow = ai.defineFlow(
  {
    name: 'analyzeDsrFlow',
    inputSchema: AnalyzeDsrInputSchema,
    outputSchema: AnalyzeDsrOutputSchema,
  },
  async (input) => {
    const maxRetries = 3;
    const initialDelay = 1000;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const {output} = await prompt(input);
            if (!output) {
              throw new Error("AI analysis failed to produce a valid output.");
            }

            if (!Array.isArray(output)) {
                console.error("DSR Analysis: AI returned non-array output:", JSON.stringify(output));
                throw new Error("AI analysis did not return the expected list of daily reports. The document format might be unsupported.");
            }
            
            const rawOutput = output as any[];

            // Sanitize the output to remove any malformed meter readings and fix non-numeric values.
            const sanitizedOutput = rawOutput.map(dailyReport => {
                // Ensure meterReadings exists and is an array before trying to filter it
                const sanitizedMeterReadings = (Array.isArray(dailyReport.meterReadings) ? dailyReport.meterReadings : [])
                    .map(reading => ({
                        // Coerce all numeric values, falling back to 0 if invalid
                        fuelName: reading.fuelName,
                        nozzleId: Number(reading.nozzleId) || 0,
                        openingReading: Number(reading.openingReading) || 0,
                        closingReading: Number(reading.closingReading) || 0,
                        testing: Number(reading.testing) || 0,
                    }))
                    .filter(reading =>
                        // A valid reading must have a fuel name and a positive nozzle ID after sanitization
                        reading.fuelName && reading.nozzleId > 0
                    );

                // Sanitize top-level numeric fields
                const sanitizedReport = {
                    ...dailyReport,
                    meterReadings: sanitizedMeterReadings,
                    lubricantSales: Number(dailyReport.lubricantSales) || 0,
                    creditSales: Number(dailyReport.creditSales) || 0,
                    phonepeSales: Number(dailyReport.phonepeSales) || 0,
                    cashDeposited: Number(dailyReport.cashDeposited) || 0,
                };

                return sanitizedReport;
            });

            // Now we can safely parse with our strict Zod schema.
            return AnalyzeDsrOutputSchema.parse(sanitizedOutput);
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
