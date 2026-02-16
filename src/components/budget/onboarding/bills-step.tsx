'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { BillFrequency } from '@/types/budget';

interface Bill {
  name: string;
  amount: number;
  dueDay: number;
  frequency: string;
}

interface BillsStepProps {
  initialData: Bill[];
  onComplete: (bills: Bill[]) => void;
  onBack: () => void;
  isLoading: boolean;
}

export function BillsStep({ initialData, onComplete, onBack, isLoading }: BillsStepProps) {
  const [bills, setBills] = useState<Bill[]>(initialData);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [frequency, setFrequency] = useState<BillFrequency>('monthly');

  const handleAdd = () => {
    if (!name || !amount || !dueDay) return;

    setBills([...bills, { name, amount: parseFloat(amount), dueDay: parseInt(dueDay), frequency }]);
    setName('');
    setAmount('');
    setDueDay('');
  };

  const handleRemove = (index: number) => {
    setBills(bills.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(bills);
  };

  const handleSkip = () => {
    onComplete([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-[10px] p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="billName" className="text-sm font-light text-foreground">
              Bill Name
            </Label>
            <Input
              id="billName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Electric Bill"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billAmount" className="text-sm font-light text-foreground">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="billAmount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-10 pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDay" className="text-sm font-light text-foreground">
              Due Day
            </Label>
            <Input
              id="dueDay"
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              placeholder="15"
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="frequency" className="text-sm font-light text-foreground">
              Frequency
            </Label>
            <Select value={frequency} onValueChange={(v) => setFrequency(v as BillFrequency)}>
              <SelectTrigger id="frequency" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleAdd}
              className="w-full h-10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Bill
            </Button>
          </div>
        </div>

        {bills.length > 0 && (
          <div className="pt-4 border-t border-border space-y-2">
            {bills.map((bill, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-background rounded-[5px] p-3 border border-border"
              >
                <div className="flex-1">
                  <div className="font-medium">{bill.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Due on day {bill.dueDay} • {bill.frequency}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-currency">
                    ${bill.amount.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="button" onClick={onBack} variant="outline" className="h-12 flex-1" disabled={isLoading}>
          Back
        </Button>
        {bills.length === 0 ? (
          <Button type="button" onClick={handleSkip} className="h-12 flex-1 font-bold" disabled={isLoading}>
            {isLoading ? 'Setting up...' : 'Skip for Now'}
          </Button>
        ) : (
          <Button type="submit" className="h-12 flex-1 font-bold" disabled={isLoading}>
            {isLoading ? 'Setting up...' : 'Complete Setup'}
          </Button>
        )}
      </div>
    </form>
  );
}
