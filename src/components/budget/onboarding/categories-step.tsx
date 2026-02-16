'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { CategoryType } from '@/types/budget';

interface Category {
  name: string;
  type: CategoryType;
  amount: number;
}

interface CategoriesStepProps {
  initialData: Category[];
  onComplete: (categories: Category[]) => void;
  onBack: () => void;
}

export function CategoriesStep({ initialData, onComplete, onBack }: CategoriesStepProps) {
  const [categories, setCategories] = useState<Category[]>(
    initialData.length > 0 ? initialData : []
  );
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('flexible');
  const [amount, setAmount] = useState('');

  const handleAdd = () => {
    if (!name || !amount) return;

    setCategories([...categories, { name, type, amount: parseFloat(amount) }]);
    setName('');
    setAmount('');
  };

  const handleRemove = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(categories);
  };

  const handleSkip = () => {
    onComplete([]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-[10px] p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="categoryName" className="text-sm font-light text-foreground">
              Category Name
            </Label>
            <Input
              id="categoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Groceries"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryType" className="text-sm font-light text-foreground">
              Type
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as CategoryType)}>
              <SelectTrigger id="categoryType" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryAmount" className="text-sm font-light text-foreground">
              Amount
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="categoryAmount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 pl-7"
                />
              </div>
              <Button
                type="button"
                onClick={handleAdd}
                size="icon"
                className="h-10 w-10 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {categories.length > 0 && (
          <div className="pt-4 border-t border-border space-y-2">
            {categories.map((cat, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-background rounded-[5px] p-3 border border-border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs px-2 py-1 rounded-[5px] bg-muted text-muted-foreground">
                      {cat.type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-currency">
                    ${cat.amount.toFixed(2)}
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
        <Button type="button" onClick={onBack} variant="outline" className="h-12 flex-1">
          Back
        </Button>
        {categories.length === 0 ? (
          <Button type="button" onClick={handleSkip} className="h-12 flex-1">
            Skip for Now
          </Button>
        ) : (
          <Button type="submit" className="h-12 flex-1 font-bold">
            Continue
          </Button>
        )}
      </div>
    </form>
  );
}
