'use server';
/**
 * @fileOverview An AI flow for analyzing and tagging funds from a bank statement.
 *
 * - analyzeFunds - A function that handles the fund analysis.
 * - FundAnalysisInput - The input type for the analyzeFunds function.
 * - FundAnalysisOutput - The return type for the analyzeFunds function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FundAnalysisInputSchema = z.object({
  statementDataUri: z
    .string()
    .describe(
      "A bank statement (Excel, CSV, or PDF), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  yourInitialCapital: z.number().describe("The initial capital amount invested by the owner."),
  managerInitialCapital: z.number().describe("The initial capital amount invested by the manager."),
});
type FundAnalysisInput = z.infer<typeof FundAnalysisInputSchema>;


const MonthlyAnalysisSchema = z.object({
    month: z.string().describe("The month of the analysis (e.g., 'January 2024')."),
    managerFundUsed: z.number().describe("Total amount of the Manager's Fund used this month."),
    yourFundUsed: z.number().describe("Total amount of the Owner's Fund used this month."),
    salesRevenue: z.number().describe("Total sales revenue deposited this month."),
    profitEstimated: z.number().describe("Estimated profit for the month. Base this on sales revenue minus a reasonable percentage for costs if not explicitly available."),
    fundReturnedToYou: z.number().describe("Any amount explicitly transferred back to the owner."),
});

const FinalSummarySchema = z.object({
    totalManagerFundUsed: z.number().describe("The cumulative total of the manager's fund that has been used across all months."),
    yourFundInRotation: z.number().describe("The total amount of your own capital that is still invested or being used in the business."),
    totalCapitalReturned: z.number().describe("The cumulative total of capital that has been returned to you."),
    netWorthInBusiness: z.number().describe("Your final net worth in the business, calculated as (Your Fund Still in Rotation) - (Total Capital Returned). Do not include stock value as it is not available in the bank statement."),
});

const TransactionSchema = z.object({
    date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
    description: z.string().describe("The original transaction description from the statement."),
    amount: z.number().describe("The transaction amount."),
    fundSource: z.enum(['Manager Fund', 'Your Fund', 'Sales Revenue', 'Uncategorized Credit']).describe("The tagged source of the fund for this transaction."),
});

const CategorizedTransactionsSchema = z.object({
    identifiedPurchases: z.array(TransactionSchema).describe("Transactions identified as likely fuel or major equipment purchases (e.g., from IOCL, BPCL)."),
    managerPayments: z.array(TransactionSchema).describe("Transactions identified as payments to the manager (e.g., salary, reimbursements)."),
    creditPayoffs: z.array(TransactionSchema).describe("Transactions that appear to be repayments for credit taken from suppliers."),
    unidentifiedDebits: z.array(TransactionSchema).describe("Debit transactions that could not be confidently categorized."),
});

const FundAnalysisOutputSchema = z.object({
  monthlyAnalysis: z.array(MonthlyAnalysisSchema).describe("A month-by-month breakdown of fund usage."),
  finalSummary: FinalSummarySchema.describe("A final summary of the overall financial position."),
  categorizedTransactions: CategorizedTransactionsSchema.describe("A detailed breakdown of categorized debit transactions."),
});
type FundAnalysisOutput = z.infer<typeof FundAnalysisOutputSchema>;


export async function analyzeFunds(input: FundAnalysisInput): Promise<FundAnalysisOutput> {
  return fundAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fundAnalysisPrompt',
  input: {schema: FundAnalysisInputSchema},
  output: {schema: FundAnalysisOutputSchema},
  prompt: `You are a meticulous financial analyst. Your task is to analyze the provided bank statement to untangle two merged funds in a single overdraft account.

**CONTEXT:**
- The business owner invested an initial capital of {{{yourInitialCapital}}}. This is "Your Fund".
- The manager invested {{{managerInitialCapital}}}. This is the "Manager Fund".
- All expenses and revenues go through this single account.

**OBJECTIVE:**
Analyze the statement to determine:
1. How much of the manager's fund has been used.
2. How much of the owner's capital is still in rotation.
3. The owner's net worth in the business based *only* on the statement data.
4. Categorize all significant debits for review.

**EXECUTION PLAN:**

**Step 1: Tag All Credits**
- Find the large credit corresponding to the manager's investment (around {{{managerInitialCapital}}}). Tag this as "Manager Fund".
- Find any other large, non-sales credits. Assume these are additional capital from the owner and tag them as "Your Fund".
- All other regular credits should be tagged as "Sales Revenue".
- Tag any other credits as "Uncategorized Credit".

**Step 2: Tag All Debits by Fund Source (This is CRITICAL)**
- Apply this logic STRICTLY:
- The manager's fund is used FIRST for all debits (expenses, purchases, etc.).
- Track the remaining balance of the "Manager Fund" (starts at {{{managerInitialCapital}}}).
- For each debit transaction, subtract it from the remaining "Manager Fund". Tag this debit's fundSource as "Manager Fund".
- ONCE the "Manager Fund" balance is fully depleted (reaches zero or less), ALL subsequent debits MUST be tagged with a fundSource of "Your Fund".

**Step 3: Categorize All Tagged Debits**
- After tagging the fund source, analyze the description of each debit transaction to categorize it.
- **Identified Purchases**: Transactions with descriptions like 'IOCL', 'BPCL', 'HPCL', or mention of invoices, or large equipment purchases.
- **Manager Payments**: Transactions that look like salary payments or transfers to the manager's personal account.
- **Credit Payoffs**: Regular, large payments to suppliers that are not for fuel.
- **Unidentified Debits**: Any other debit that does not fit the above categories.
- Populate the \`categorizedTransactions\` object with these findings. Each transaction in these arrays must retain its original date, description, amount, and its tagged fund source from Step 2.

**Step 4: Monthly Analysis**
- Group all tagged transactions by month.
- For each month, calculate the values for the 'monthlyAnalysis' table.
  - \`managerFundUsed\`: Sum of all debits tagged "Manager Fund".
  - \`yourFundUsed\`: Sum of all debits tagged "Your Fund".
  - \`salesRevenue\`: Sum of all credits tagged "Sales Revenue".
  - \`profitEstimated\`: If cost of goods is not available, estimate profit as a reasonable percentage of sales revenue (e.g., 10-15%).
  - \`fundReturnedToYou\`: Look for any debits that are clearly transfers back to the owner, not business expenses.

**Step 5: Final Summary**
- Calculate the final summary values based on the entire period.
  - \`totalManagerFundUsed\`: Sum of \`managerFundUsed\` across all months.
  - \`yourFundInRotation\`: This is the total of all debits tagged as "Your Fund".
  - \`totalCapitalReturned\`: Sum of \`fundReturnedToYou\` across all months.
  - \`netWorthInBusiness\`: Calculate this as (yourFundInRotation - totalCapitalReturned). Do not attempt to calculate stock value.

**IMPORTANT:**
- Be meticulous. Your output must be a valid JSON object matching the provided schema.
- The logic for debit fund source tagging (Step 2) is the most important part. First exhaust the manager's fund, then use the owner's.

Bank Statement: {{media url=statementDataUri}}`,
});

const fundAnalysisFlow = ai.defineFlow(
  {
    name: 'fundAnalysisFlow',
    inputSchema: FundAnalysisInputSchema,
    outputSchema: FundAnalysisOutputSchema,
  },
  async (input) => {
    if (input.yourInitialCapital <= 0 || input.managerInitialCapital <= 0) {
        throw new Error("Initial capital amounts must be positive values.");
    }
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI analysis failed to produce a valid output. Please check the statement format.");
    }
    return output;
  }
);
