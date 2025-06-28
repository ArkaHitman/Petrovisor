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
    quantity: z.coerce.number().describe("The quantity of the fuel delivered in litres."),
    rate: z.coerce.number().describe("The rate per litre of the fuel."),
    amount: z.coerce.number().describe("The total amount for this fuel item (quantity * rate)."),
});

const AnalyzeChallanOutputSchema = z.object({
    invoiceNumber: z.string().describe("The invoice or challan number."),
    date: z.string().describe("The date of the challan in YYYY-MM-DD format."),
    supplierName: z.string().optional().describe("The name of the supplier, e.g., 'Indian Oil Corporation Ltd.'."),
    vehicleNumber: z.string().optional().describe("The registration number of the delivery truck."),
    items: z.array(ChallanItemSchema).describe("An array of all fuel items listed on the challan."),
    totalAmount: z.coerce.number().describe("The final total amount of the challan."),
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
  - Extract the quantity in litres, the rate per litre, and the total amount for that line item.
- **totalAmount**: Extract the final, grand total amount of the invoice.

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
    return output;
  }
);
