
'use server';
/**
 * @fileOverview An AI flow for a comprehensive financial audit of the petrol station.
 *
 * - performFinancialAudit - A function that orchestrates the audit.
 * - FinancialAuditInput - The input type for the audit function.
 * - FinancialAuditOutput - The return type for the audit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const FinancialAuditInputSchema = z.object({
  jsonData: z
    .string()
    .describe(
      'A JSON string containing all relevant financial data. It must include: shiftReports, purchases, bankLedger, creditHistory, journalEntries, fuels, fuelPriceHistory, and chartOfAccounts.'
    ),
});
export type FinancialAuditInput = z.infer<typeof FinancialAuditInputSchema>;

// Output Schemas
const DailyAuditEntrySchema = z.object({
  date: z.string().describe("The date of the audit entry, in YYYY-MM-DD format."),
  purchaseAmount: z.number().describe("Total cost of fuel purchased on this day."),
  totalSales: z.number().describe("Total sales amount (cash + credit) for the day from shift reports."),
  creditSales: z.number().describe("Total amount of sales made on credit for the day, from shift reports."),
  cashCollectedFromSales: z.number().describe("Calculated as (Total Sales - Credit Sales) for the day."),
  creditRepaymentsReceived: z.number().describe("Total cash/bank repayments received from past credit sales on this day."),
  totalCashInHand: z.number().describe("Total physical cash expected to be in hand for the day. Calculated as (Cash from Sales + Credit Repayments)."),
  bankDeposits: z.number().describe("Total amount of cash sales deposited into the bank on this day. Find journal entries from 'Cash in Hand' to a bank account."),
  cashGap: z.number().describe("The discrepancy between cash expected and cash deposited. Calculated as (Total Cash In Hand - Bank Deposits). A negative value indicates a shortfall."),
  estimatedProfit: z.number().describe("The estimated profit for the day (Total Sales - Cost of Goods Sold for the fuel sold)."),
});

const AuditSummarySchema = z.object({
    totalPurchases: z.number().describe("Total amount spent on purchasing fuel stock over the entire period."),
    totalSales: z.number().describe("Gross total of all sales over the entire period."),
    totalCreditGiven: z.number().describe("Total credit extended to customers from shift reports."),
    totalCreditRepaid: z.number().describe("Total credit repayments received from customers."),
    currentOutstandingCredit: z.number().describe("The current outstanding credit balance (Total Credit Given - Total Credit Repaid)."),
    totalCashGap: z.number().describe("The cumulative sum of all daily cash gaps. This represents the total cash that is untracked or was not deposited."),
    totalProfit: z.number().describe("The total estimated profit over the entire period."),
    totalInvestment: z.number().describe("Total initial capital invested. Find journal entries where an 'Equity' type account is credited (e.g., Manager's Capital, Opening Balance)."),
    capitalRepaid: z.number().describe("Total capital returned to investors. Find journal entries where an 'Equity' type account is debited."),
});

const FinancialAuditOutputSchema = z.object({
  dailyBreakdown: z.array(DailyAuditEntrySchema).describe("A day-by-day breakdown of all financial activities, sorted by date in descending order."),
  summary: AuditSummarySchema.describe("An overall summary of the financial audit."),
});
export type FinancialAuditOutput = z.infer<typeof FinancialAuditOutputSchema>;

// Flow Definition
export async function performFinancialAudit(input: FinancialAuditInput): Promise<FinancialAuditOutput> {
  return financialAuditFlow(input);
}

const prompt = ai.definePrompt({
  name: 'financialAuditPrompt',
  input: {schema: FinancialAuditInputSchema},
  output: {schema: FinancialAuditOutputSchema},
  prompt: `You are an expert financial auditor for a petrol station. Your task is to analyze the provided JSON data and generate a detailed daily audit report and a final summary. The JSON data is provided in the 'jsonData' field.

**Execution Plan:**

**Step 1: Daily Breakdown Calculation**
Iterate through all dates where transactions occurred. For each date, calculate the following values and create a daily entry.
- **\`date\`**: The date for the entry in YYYY-MM-DD format.
- **\`purchaseAmount\`**: Find all \`purchases\` on this date and sum their \`amount\`.
- **\`totalSales\`**: Find all \`shiftReports\` on this date and sum their \`totalSales\`.
- **\`creditSales\`**: From the day's \`shiftReports\`, sum the \`amount\` of all entries in their \`creditSales\` arrays.
- **\`cashCollectedFromSales\`**: This is the day's \`totalSales\` minus the day's \`creditSales\`.
- **\`creditRepaymentsReceived\`**: Find all entries in \`creditHistory\` for this date where \`type\` is 'repaid' and sum their \`amount\`.
- **\`totalCashInHand\`**: This is the day's \`cashCollectedFromSales\` plus the day's \`creditRepaymentsReceived\`.
- **\`bankDeposits\`**: Find all \`journalEntries\` for this date. Look for entries where one leg is a credit to the 'Cash in Hand' account and another leg is a debit to a \`bank_account\`. Sum the amounts of these specific transactions.
- **\`cashGap\`**: This is \`totalCashInHand\` minus \`bankDeposits\`. A negative number means a cash shortfall.
- **\`estimatedProfit\`**: For each \`shiftReport\` on this date, calculate the profit. For each \`meterReading\` in the report, find the corresponding fuel's cost price for that date from \`fuelPriceHistory\`. COGS for that reading is \`saleLitres\` * \`costPrice\`. Profit is \`saleAmount\` - COGS. Sum the profit for all readings across all shifts for the day.

Once all daily entries are calculated, sort the \`dailyBreakdown\` array by date in descending order.

**Step 2: Final Summary Calculation**
Aggregate the daily breakdown data to compute the overall summary.
- **\`totalPurchases\`**: Sum of \`purchaseAmount\` from all daily entries.
- **\`totalSales\`**: Sum of \`totalSales\` from all daily entries.
- **\`totalCreditGiven\`**: Sum of \`creditSales\` from all daily entries.
- **\`totalCreditRepaid\`**: Sum of \`creditRepaymentsReceived\` from all daily entries.
- **\`currentOutstandingCredit\`**: Calculate as \`totalCreditGiven\` - \`totalCreditRepaid\`.
- **\`totalCashGap\`**: Sum of all \`cashGap\` values from the daily breakdown.
- **\`totalProfit\`**: Sum of \`estimatedProfit\` from all daily entries.
- **\`totalInvestment\`**: From all \`journalEntries\`, find entries where a leg's \`accountType\` is 'chart_of_account' and the account's \`type\` (from \`chartOfAccounts\`) is 'Equity'. Sum the \`credit\` amounts of these legs.
- **\`capitalRepaid\`**: Similar to investment, but sum the \`debit\` amounts of the Equity account legs.

Provide the final output strictly in the specified JSON format.

JSON Data: {{{jsonData}}}
`,
});

const financialAuditFlow = ai.defineFlow(
  {
    name: 'financialAuditFlow',
    inputSchema: FinancialAuditInputSchema,
    outputSchema: FinancialAuditOutputSchema,
  },
  async (input) => {
    const maxRetries = 3;
    const initialDelay = 1000;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const {output} = await prompt(input);
            if (!output) {
                throw new Error("AI analysis failed to produce a valid audit report.");
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
