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
    const periodStart = new Date(paycheck.period_start_date || paycheck.pay_date);
    const periodEnd = new Date(paycheck.period_end_date || paycheck.pay_date);

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
        // Compute candidate due dates in the months around the pay period
        const candidates: Date[] = [];

        // Try the due_day in the month of periodStart
        const d1 = new Date(periodStart.getFullYear(), periodStart.getMonth(), bill.due_day);
        candidates.push(d1);

        // Try the next month
        const d2 = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, bill.due_day);
        candidates.push(d2);

        // Try the previous month (in case the period spans a month boundary)
        const d3 = new Date(periodStart.getFullYear(), periodStart.getMonth() - 1, bill.due_day);
        candidates.push(d3);

        // Keep only dates within [periodStart, periodEnd)
        const validDates = candidates.filter(
          d => d >= periodStart && d < periodEnd
        );

        if (validDates.length > 0) {
          const dueDate = validDates.sort((a, b) => a.getTime() - b.getTime())[0];
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
