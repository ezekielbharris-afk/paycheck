import Link from 'next/link';
import { Wallet, Calendar, TrendingDown, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight">
            Budget by
            <span className="text-primary"> Paycheck</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-light">
            Stop planning monthly. Start planning by paycheck. Know exactly what you can spend before your next payday.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center h-12 px-8 font-bold bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center h-12 px-8 font-bold border border-border text-foreground rounded-[10px] hover:bg-muted transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {[
            {
              icon: Wallet,
              title: 'Paycheck-Based',
              description: 'Budget based on when you actually get paid, not arbitrary monthly cycles.',
            },
            {
              icon: Calendar,
              title: 'Bill Tracking',
              description: 'See which bills are due before your next paycheck at a glance.',
            },
            {
              icon: TrendingDown,
              title: 'Spending Control',
              description: 'Track spending by category and see how much you have left in real-time.',
            },
            {
              icon: CheckCircle,
              title: 'Simple & Clear',
              description: 'No complex features. Just the essentials to keep you on track.',
            },
          ].map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-[10px] p-6 space-y-3"
              >
                <div className="w-12 h-12 rounded-[10px] bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="text-muted-foreground font-light">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* How It Works */}
        <div className="mt-24 space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Set Your Pay Schedule',
                description: 'Tell us when you get paid and how much.',
              },
              {
                step: '02',
                title: 'Add Bills & Categories',
                description: 'Track recurring bills and set spending budgets.',
              },
              {
                step: '03',
                title: 'See What You Can Spend',
                description: 'Know exactly how much is left after bills and savings.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center space-y-3">
                <div className="text-6xl font-black text-primary/20">{item.step}</div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-card border border-border rounded-[15px] p-12 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Take Control?</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Join people who are managing their money paycheck by paycheck, with clarity and confidence.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center h-12 px-8 font-bold bg-primary text-primary-foreground rounded-[10px] hover:bg-primary/90 transition-colors"
          >
            Start Budgeting Now
          </Link>
        </div>
      </div>
    </div>
  );
}
