import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePayPeriodRequest {
  userId: string;
  pay_date: string;
  period_start_date: string;
  period_end_date: string;
  net_amount: number;
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

    const { userId, pay_date, period_start_date, period_end_date, net_amount } =
      await req.json() as CreatePayPeriodRequest;

    if (!userId || !pay_date || !period_start_date || !period_end_date || !net_amount) {
      throw new Error('Missing required fields');
    }

    // 1. Mark ALL existing current paychecks for this user as not current
    await supabaseClient
      .from('paychecks')
      .update({ is_current: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_current', true);

    // 2. Insert the new paycheck row
    const { data: newPaycheck, error: insertError } = await supabaseClient
      .from('paychecks')
      .insert({
        user_id: userId,
        pay_date,
        period_start_date,
        period_end_date,
        net_amount,
        is_current: true,
        reserved_bills: 0,
        reserved_savings: 0,
        spendable: net_amount,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    if (!newPaycheck) throw new Error('Failed to create new paycheck');

    const paycheckId = newPaycheck.id;

    // 3. Initialize category_spending records from the user's categories
    const { data: categories } = await supabaseClient
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (categories && categories.length > 0) {
      const categorySpending = categories.map((cat: any) => ({
        paycheck_id: paycheckId,
        category_id: cat.id,
        planned: cat.amount_per_paycheck,
        spent: 0,
      }));

      await supabaseClient
        .from('category_spending')
        .insert(categorySpending);
    }

    // 4. Initialize bill_payments from active bills
    const periodStart = new Date(period_start_date + 'T00:00:00Z');
    const periodEnd = new Date(period_end_date + 'T00:00:00Z');

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
        const candidates: Date[] = [];
        for (let monthOffset = -3; monthOffset <= 3; monthOffset++) {
          const candidateDate = new Date(Date.UTC(
            periodStart.getUTCFullYear(),
            periodStart.getUTCMonth() + monthOffset,
            bill.due_day,
            0, 0, 0
          ));
          candidates.push(candidateDate);
        }

        const validDates = candidates.filter(
          d => d >= periodStart && d < periodEnd
        );

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

    // 5. Update paycheck summary fields
    const totalSavings = categories
      ?.filter((c: any) => c.type === 'savings')
      .reduce((sum: number, c: any) => sum + c.amount_per_paycheck, 0) || 0;

    const totalCategories = categories
      ?.reduce((sum: number, c: any) => sum + c.amount_per_paycheck, 0) || 0;

    const spendable = net_amount - totalBills - totalCategories;

    await supabaseClient
      .from('paychecks')
      .update({
        reserved_bills: totalBills,
        reserved_savings: totalSavings,
        spendable: spendable,
      })
      .eq('id', paycheckId);

    // 6. Also update pay_schedules to reflect the new payday
    await supabaseClient
      .from('pay_schedules')
      .update({
        net_amount: net_amount,
        next_payday: pay_date,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return new Response(
      JSON.stringify({ success: true, paycheckId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
