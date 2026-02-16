'use client';

import { useState } from 'react';
import { BillPayment } from '@/types/budget';
import { formatShortDate } from '@/lib/budget-utils';
import { Check, Circle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BillsListProps {
  bills: BillPayment[];
  onBillPaid: (billPaymentId: string, actualAmount: number) => void;
}

export function BillsList({ bills, onBillPaid }: BillsListProps) {
  const [selectedBill, setSelectedBill] = useState<BillPayment | null>(null);
  const [actualAmount, setActualAmount] = useState('');

  const handleBillClick = (bill: BillPayment) => {
    if (bill.is_paid) return;
    setSelectedBill(bill);
    setActualAmount(bill.planned_amount.toString());
  };

  const handleConfirmPaid = () => {
    if (!selectedBill) return;
    onBillPaid(selectedBill.id, parseFloat(actualAmount));
    setSelectedBill(null);
    setActualAmount('');
  };

  if (bills.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Bills This Period</h2>
        <div className="bg-card border border-border rounded-[10px] p-8 text-center">
          <p className="text-muted-foreground">No bills due this pay period</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Bills This Period</h2>
        <div className="bg-card border border-border rounded-[10px] divide-y divide-border">
          {bills.map((billPayment) => (
            <button
              key={billPayment.id}
              onClick={() => handleBillClick(billPayment)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
              disabled={billPayment.is_paid}
            >
              <div className="flex items-center gap-3">
                <div className={`${billPayment.is_paid ? 'text-success' : 'text-muted-foreground'}`}>
                  {billPayment.is_paid ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className={`font-medium ${billPayment.is_paid ? 'opacity-60' : ''}`}>
                    {billPayment.bill?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Due {formatShortDate(billPayment.due_date)}
                  </div>
                </div>
              </div>
              <div className={`font-bold text-currency ${billPayment.is_paid ? 'opacity-60' : ''}`}>
                ${(billPayment.actual_amount || billPayment.planned_amount).toFixed(2)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Bill as Paid</DialogTitle>
            <DialogDescription>
              {selectedBill?.bill?.name} - Due {selectedBill && formatShortDate(selectedBill.due_date)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="actualAmount">Actual Amount Paid</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="actualAmount"
                  type="number"
                  step="0.01"
                  value={actualAmount}
                  onChange={(e) => setActualAmount(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedBill(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConfirmPaid} className="flex-1">
                Mark as Paid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
