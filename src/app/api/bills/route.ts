import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/../supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, amount, due_day, frequency } = body;

    // Validate input
    if (!name || !amount || !due_day || !frequency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert the bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert({
        user_id: user.id,
        name,
        amount,
        due_day,
        frequency,
        is_active: true,
      })
      .select()
      .single();

    if (billError) {
      console.error('Error creating bill:', billError);
      return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
    }

    // Get current paycheck
    const { data: currentPaycheck } = await supabase
      .from('paychecks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .single();

    if (currentPaycheck) {
      // Calculate next due date for this bill based on current paycheck period
      const periodEnd = new Date(currentPaycheck.period_end_date || currentPaycheck.pay_date);
      const dueDate = new Date(periodEnd);
      dueDate.setDate(due_day);

      // If due date is before period end, it should be in this paycheck
      if (dueDate <= periodEnd) {
        // Create bill payment for current paycheck
        const { error: paymentError } = await supabase
          .from('bill_payments')
          .insert({
            paycheck_id: currentPaycheck.id,
            bill_id: bill.id,
            planned_amount: amount,
            due_date: dueDate.toISOString().split('T')[0],
            is_paid: false,
          });

        if (paymentError) {
          console.error('Error creating bill payment:', paymentError);
        } else {
          // Update paycheck totals
          const { data: allBillPayments } = await supabase
            .from('bill_payments')
            .select('planned_amount')
            .eq('paycheck_id', currentPaycheck.id);

          const totalBills = allBillPayments?.reduce((sum, bp) => sum + bp.planned_amount, 0) || 0;

          await supabase
            .from('paychecks')
            .update({
              reserved_bills: totalBills,
              spendable: currentPaycheck.net_amount - totalBills - currentPaycheck.reserved_savings,
            })
            .eq('id', currentPaycheck.id);
        }
      }
    }

    return NextResponse.json({ data: bill }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/bills:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
