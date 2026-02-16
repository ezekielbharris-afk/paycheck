'use client';

import { useState } from 'react';
import { CategorySpending } from '@/types/budget';
import { getBudgetHealthColor, getBudgetHealthBg, getProgressPercentage } from '@/lib/budget-utils';
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

interface CategoriesGridProps {
  categories: CategorySpending[];
  onSpendingLogged: (categoryId: string, amount: number) => void;
}

export function CategoriesGrid({ categories, onSpendingLogged }: CategoriesGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategorySpending | null>(null);
  const [amount, setAmount] = useState('');

  const handleCategoryClick = (category: CategorySpending) => {
    setSelectedCategory(category);
    setAmount('');
  };

  const handleLogSpending = () => {
    if (!selectedCategory || !amount) return;
    onSpendingLogged(selectedCategory.category_id, parseFloat(amount));
    setSelectedCategory(null);
    setAmount('');
  };

  if (categories.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Budget Categories</h2>
        <div className="bg-card border border-border rounded-[10px] p-8 text-center">
          <p className="text-muted-foreground">No budget categories set up</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Budget Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((categorySpend) => {
            const percentage = getProgressPercentage(categorySpend.spent, categorySpend.planned);
            const healthColor = getBudgetHealthColor(categorySpend.spent, categorySpend.planned);
            const healthBg = getBudgetHealthBg(categorySpend.spent, categorySpend.planned);

            return (
              <button
                key={categorySpend.id}
                onClick={() => handleCategoryClick(categorySpend)}
                className="bg-card border border-border rounded-[10px] p-5 hover:border-primary/50 transition-all text-left"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{categorySpend.category?.name}</h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                        {categorySpend.category?.type}
                      </p>
                    </div>
                    <div className={`text-right ${healthColor}`}>
                      <div className="text-2xl font-bold text-currency">
                        ${categorySpend.remaining.toFixed(2)}
                      </div>
                      <div className="text-xs">left</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        ${categorySpend.spent.toFixed(2)} spent
                      </span>
                      <span className="text-muted-foreground">
                        of ${categorySpend.planned.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full ${healthBg} transition-all duration-200`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Spending</DialogTitle>
            <DialogDescription>
              {selectedCategory?.category?.name} • ${selectedCategory?.remaining.toFixed(2)} remaining
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="spendAmount">Amount Spent</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="spendAmount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSelectedCategory(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleLogSpending} className="flex-1" disabled={!amount}>
                Log Spending
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
