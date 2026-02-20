'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BillFrequency } from '@/types/budget';
import { toast } from 'sonner';

interface AddBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBillAdded: () => void;
}

export function AddBillDialog({ open, onOpenChange, onBillAdded }: AddBillDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim() || !amount || !dueDay) {
      setError('Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    const dueDayNum = parseInt(dueDay);

    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) {
      setError('Due day must be between 1 and 31');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          amount: amountNum,
          due_day: dueDayNum,
          frequency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add bill');
      }

      // Reset form
      setName('');
      setAmount('');
      setDueDay('');
      setFrequency('monthly');
      
      toast.success('Bill added successfully');
      onBillAdded();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add bill';
      setError(message);
      toast.error('Failed to add bill', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setAmount('');
      setDueDay('');
      setFrequency('monthly');
      setError('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            Add New Bill
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a recurring bill that will be automatically allocated to paychecks
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="bill-name" className="text-sm font-light text-muted-foreground">
              Bill Name
            </Label>
            <Input
              id="bill-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rent, Electric, Internet"
              className="bg-background border-border"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-amount" className="text-sm font-light text-muted-foreground">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="bill-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7 bg-background border-border"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-due-day" className="text-sm font-light text-muted-foreground">
              Due Day of Month
            </Label>
            <Input
              id="bill-due-day"
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="1-31"
              className="bg-background border-border"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-frequency" className="text-sm font-light text-muted-foreground">
              Frequency
            </Label>
            <Select
              value={frequency}
              onValueChange={(value) => setFrequency(value as BillFrequency)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="bill-frequency" className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? 'Adding...' : 'Add Bill'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
