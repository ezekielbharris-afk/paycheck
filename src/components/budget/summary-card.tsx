interface SummaryCardProps {
  netPay: number;
  reservedBills: number;
  reservedSavings: number;
  spendable: number;
}

export function SummaryCard({ netPay, reservedBills, reservedSavings, spendable }: SummaryCardProps) {
  const stats = [
    {
      label: 'Net Pay',
      value: netPay,
      color: 'text-foreground',
    },
    {
      label: 'Reserved for Bills',
      value: reservedBills,
      color: 'text-foreground',
    },
    {
      label: 'Reserved for Savings',
      value: reservedSavings,
      color: 'text-foreground',
    },
    {
      label: 'Spendable Left',
      value: spendable,
      color: 'text-primary',
      highlight: true,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-[10px] p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={stat.label} className={stat.highlight ? 'lg:border-l lg:border-border lg:pl-6' : ''}>
            <div className="space-y-1">
              <p className="text-sm font-light text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold text-currency ${stat.color}`}>
                ${stat.value.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
