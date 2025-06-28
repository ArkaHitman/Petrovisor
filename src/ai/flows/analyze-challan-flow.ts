'use server';
/**
 * @fileOverview An AI flow for analyzing fuel delivery challans.
 *
 * - analyzeChallan - A function that handles the challan analysis.
 * - AnalyzeChallanInput - The input type for the analyzeChallan function.
 * - AnalyzeChallanOutput - The return type for the analyzeChallan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeChallanInputSchema = z.object({
  challanDataUri: z
    .string()
    .describe(
      "An image or PDF of a fuel delivery challan/invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeChallanInput = z.infer<typeof AnalyzeChallanInputSchema>;

const ChallanItemSchema = z.object({
    fuelName: z.string().describe("The name of the fuel delivered, e.g., 'MS' for Petrol, 'HSD' for Diesel."),
    quantity: z.coerce.number().describe("The quantity of the fuel delivered, converted to litres. For example, if the challan says 5 KL, this value should be 5000."),
    rate: z.coerce.number().describe("The rate per litre of the fuel. If the challan provides a rate per KL, you must calculate and return the per-litre rate."),
    amount: z.coerce.number().describe("The total amount for this fuel item (quantity * rate)."),
});

const AnalyzeChallanOutputSchema = z.object({
    invoiceNumber: z.string().describe("The invoice or challan number."),
    date: z.string().describe("The date of the challan in YYYY-MM-DD format."),
    supplierName: z.string().optional().describe("The name of the supplier, e.g., 'Indian Oil Corporation Ltd.'."),
    vehicleNumber: z.string().optional().describe("The registration number of the delivery truck."),
    items: z.array(ChallanItemSchema).describe("An array of all fuel items listed on the challan."),
    subTotal: z.coerce.number().optional().describe("The total amount of all items before any taxes or other charges. If not explicitly mentioned, this is the sum of all item amounts."),
    vatAmount: z.coerce.number().optional().describe("The total Value Added Tax (VAT) amount charged on the challan. Extract this if it's a separate line item."),
    totalAmount: z.coerce.number().describe("The final, grand total amount of the challan."),
});
export type AnalyzeChallanOutput = z.infer<typeof AnalyzeChallanOutputSchema>;

export async function analyzeChallan(input: AnalyzeChallanInput): Promise<AnalyzeChallanOutput> {
  return analyzeChallanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeChallanPrompt',
  input: {schema: AnalyzeChallanInputSchema},
  output: {schema: AnalyzeChallanOutputSchema},
  prompt: `You are an expert data entry clerk for an Indian petrol station. Your task is to analyze the provided fuel delivery challan or invoice and extract the specified information with high accuracy.

The document is a challan for a fuel delivery from a major oil marketing company like IOCL, BPCL, or HPCL.

- **invoiceNumber**: Extract the unique invoice or challan number.
- **date**: Find the date of the invoice and format it as YYYY-MM-DD.
- **supplierName**: Identify the name of the supplier (e.g., Indian Oil Corporation Ltd.).
- **vehicleNumber**: Find the truck or vehicle registration number (e.g., OD01AB1234).
- **items**: This is a list of fuels delivered. For each item:
  - Identify the fuel type. 'MS' stands for Motor Spirit (Petrol), 'HSD' stands for High-Speed Diesel. Standardize the name.
  - **Quantity Conversion**: The challan may list quantity in Kilolitres (KL). You MUST convert it to Litres (1 KL = 1000 L). The \`quantity\` field in your output must be in Litres.
  - **Rate Conversion**: The challan may list the rate per KL. You MUST calculate the rate per Litre (Rate per Litre = Rate per KL / 1000). The \`rate\` field in your output must be the final, all-inclusive price per Litre.
- **subTotal**: Find the subtotal, which is the sum of all item amounts before tax. If not explicitly listed, calculate it by summing the 'amount' of all items.
- **vatAmount**: Find a specific line item for VAT (Value Added Tax) and extract its value. If it's not present, leave it empty.
- **totalAmount**: Extract the final, grand total amount of the invoice. This is the most important figure.

**CRITICAL INSTRUCTION on Number Formatting**: Indian challans use a period (.) as a decimal separator and commas (,) for grouping. A number like "10.000" means exactly ten. A number like "4.000" means exactly four. You must correctly interpret these numbers *before* performing any conversions.
- **Example 1**: If the challan shows "Quantity: 10.000 KL", you must interpret this as 10 (ten) Kilolitres. Your final output for the \`quantity\` field must be **10000** (litres).
- **Example 2**: If the challan shows "Rate: 1,05,450.00 per KL", you must interpret this as 105450. Your final output for the \`rate\` field must be **105.45** (per litre).
- **DO NOT** mistake a period for a thousands separator. It is a decimal separator.

Return the extracted information precisely in the specified JSON format.

Delivery Challan: {{media url=challanDataUri}}`,
});

const analyzeChallanFlow = ai.defineFlow(
  {
    name: 'analyzeChallanFlow',
    inputSchema: AnalyzeChallanInputSchema,
    outputSchema: AnalyzeChallanOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI analysis failed to produce a valid output from the challan.");
    }
    // If subTotal is missing, calculate it from items
    if (!output.subTotal && output.items.length > 0) {
        output.subTotal = output.items.reduce((sum, item) => sum + item.amount, 0);
    }
    return output;
  }
);
