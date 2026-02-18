import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InitializePaycheckRequest {
  userId: string;
  paycheckId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, paycheckId } = await req.json() as InitializePaycheckRequest;

    const { data: paycheck } = await supabaseClient
      .from('paychecks')
      .select('*')
      .eq('id', paycheckId)
      .single();

    if (!paycheck) {
      throw new Error('Paycheck not found');
    }

    // Use the pay period window: period_start_date → period_end_date
    // Falls back to pay_date if the new columns haven't been populated yet
    // Parse as date strings to ensure consistent timezone handling
    const periodStartStr = paycheck.period_start_date || paycheck.pay_date;
    const periodEndStr = paycheck.period_end_date || paycheck.pay_date;
    
    // Create Date objects from YYYY-MM-DD strings at midnight UTC
    const periodStart = new Date(periodStartStr + 'T00:00:00Z');
    const periodEnd = new Date(periodEndStr + 'T00:00:00Z');

    // ---------- Categories ----------
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (categories && categories.length > 0) {
      const categorySpending = categories.map(cat => ({
        paycheck_id: paycheckId,
        category_id: cat.id,
        planned: cat.amount_per_paycheck,
        spent: 0,
      }));

      await supabaseClient
        .from('category_spending')
        .insert(categorySpending);
    }

    // ---------- Bills ----------
    // Only include bills whose due date falls within [periodStart, periodEnd)
    const { data: bills } = await supabaseClient
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    let totalBills = 0;
    if (bills && bills.length > 0) {
      const billPayments: Array<{
        paycheck_id: string;
        bill_id: string;
        planned_amount: number;
        due_date: string;
        is_paid: boolean;
      }> = [];

      for (const bill of bills) {
        // For each bill, find ALL occurrences of due_day within the pay period window
        // We need to check a wider range since periods can span month boundaries
        const candidates: Date[] = [];

        // Generate candidates for 3 months before and after the period start
        // This ensures we catch all possible due dates that could fall in the window
        for (let monthOffset = -3; monthOffset <= 3; monthOffset++) {
          // Create each candidate at midnight UTC for proper comparison
          const candidateDate = new Date(Date.UTC(
            periodStart.getUTCFullYear(),
            periodStart.getUTCMonth() + monthOffset,
            bill.due_day,
            0,
            0,
            0
          ));
          candidates.push(candidateDate);
        }

        // Filter to only dates within [periodStart, periodEnd) — inclusive start, exclusive end
        const validDates = candidates.filter(
          d => d >= periodStart && d < periodEnd
        );

        // Add ALL valid occurrences (a bill might recur multiple times in one period)
        for (const dueDate of validDates) {
          totalBills += bill.amount;

          billPayments.push({
            paycheck_id: paycheckId,
            bill_id: bill.id,
            planned_amount: bill.amount,
            due_date: dueDate.toISOString().split('T')[0],
            is_paid: false,
          });
        }
      }

      if (billPayments.length > 0) {
        await supabaseClient
          .from('bill_payments')
          .insert(billPayments);
      }
    }

    // ---------- Update paycheck summary ----------
    const totalSavings = categories
      ?.filter(c => c.type === 'savings')
      .reduce((sum, c) => sum + c.amount_per_paycheck, 0) || 0;

    const totalCategories = categories
      ?.reduce((sum, c) => sum + c.amount_per_paycheck, 0) || 0;

    const spendable = paycheck.net_amount - totalBills - totalCategories;

    await supabaseClient
      .from('paychecks')
      .update({
        reserved_bills: totalBills,
        reserved_savings: totalSavings,
        spendable: spendable,
      })
      .eq('id', paycheckId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
