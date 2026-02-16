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

    const { data: bills } = await supabaseClient
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    let totalBills = 0;
    if (bills && bills.length > 0) {
      const billPayments = bills.map(bill => {
        const dueDate = new Date(paycheck.pay_date);
        dueDate.setDate(bill.due_day);
        
        if (dueDate < new Date(paycheck.pay_date)) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }

        totalBills += bill.amount;

        return {
          paycheck_id: paycheckId,
          bill_id: bill.id,
          planned_amount: bill.amount,
          due_date: dueDate.toISOString().split('T')[0],
          is_paid: false,
        };
      });

      await supabaseClient
        .from('bill_payments')
        .insert(billPayments);
    }

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
