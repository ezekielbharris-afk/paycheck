import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/../supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, amount, due_day, frequency } = body;

    if (!id || !name || !amount || !due_day || !frequency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amountNum = parseFloat(amount);
    const dueDayNum = parseInt(due_day);

    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      return NextResponse.json({ error: 'Due day must be between 1 and 31' }, { status: 400 });
    }

    // Update the bill record
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .update({
        name: name.trim(),
        amount: amountNum,
        due_day: dueDayNum,
        frequency,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (billError) {
      console.error('Error updating bill:', billError);
      return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
    }

    // Update bill_payments for current paycheck that reference this bill
    const { data: currentPaycheck } = await supabase
      .from('paychecks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .single();

    if (currentPaycheck) {
      // Update planned_amount on unpaid bill_payments for this bill
      await supabase
        .from('bill_payments')
        .update({ planned_amount: amountNum })
        .eq('paycheck_id', currentPaycheck.id)
        .eq('bill_id', id)
        .eq('is_paid', false);

      // Recalculate paycheck totals
      const { data: allBillPayments } = await supabase
        .from('bill_payments')
        .select('planned_amount, actual_amount, is_paid')
        .eq('paycheck_id', currentPaycheck.id);

      const totalBills = allBillPayments?.reduce(
        (sum, bp) => sum + (bp.is_paid ? (bp.actual_amount || bp.planned_amount) : bp.planned_amount),
        0
      ) || 0;

      await supabase
        .from('paychecks')
        .update({
          reserved_bills: totalBills,
          spendable: currentPaycheck.net_amount - totalBills - currentPaycheck.reserved_savings,
        })
        .eq('id', currentPaycheck.id);
    }

    return NextResponse.json({ data: bill }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/bills:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('id');

    if (!billId) {
      return NextResponse.json({ error: 'Missing bill ID' }, { status: 400 });
    }

    // Get current paycheck before deleting
    const { data: currentPaycheck } = await supabase
      .from('paychecks')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .single();

    // Delete associated bill_payments first
    if (currentPaycheck) {
      await supabase
        .from('bill_payments')
        .delete()
        .eq('bill_id', billId)
        .eq('paycheck_id', currentPaycheck.id);
    }

    // Delete the bill record
    const { error: deleteError } = await supabase
      .from('bills')
      .delete()
      .eq('id', billId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting bill:', deleteError);
      return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 });
    }

    // Recalculate paycheck totals
    if (currentPaycheck) {
      const { data: allBillPayments } = await supabase
        .from('bill_payments')
        .select('planned_amount, actual_amount, is_paid')
        .eq('paycheck_id', currentPaycheck.id);

      const totalBills = allBillPayments?.reduce(
        (sum, bp) => sum + (bp.is_paid ? (bp.actual_amount || bp.planned_amount) : bp.planned_amount),
        0
      ) || 0;

      await supabase
        .from('paychecks')
        .update({
          reserved_bills: totalBills,
          spendable: currentPaycheck.net_amount - totalBills - currentPaycheck.reserved_savings,
        })
        .eq('id', currentPaycheck.id);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/bills:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
              spendable: currentPaycheck.net_amount - totalBills,
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
