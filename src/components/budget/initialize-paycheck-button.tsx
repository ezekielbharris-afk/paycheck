'use client';

import { useState } from 'react';
import { createClient } from '@/../supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function InitializePaycheckButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleInitialize = async () => {
    try {
      setIsLoading(true);
      const supabase = await createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Not authenticated');
        return;
      }

      // Get current paycheck
      const { data: paycheck, error: paycheckError } = await supabase
        .from('paychecks')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (paycheckError || !paycheck) {
        toast.error('No paycheck found');
        return;
      }

      // Call the edge function to initialize
      const response = await supabase.functions.invoke('initialize-paycheck', {
        body: {
          userId: user.id,
          paycheckId: paycheck.id,
        },
      });

      if (response.error) {
        toast.error('Failed to initialize paycheck');
        return;
      }

      toast.success('Paycheck initialized! Categories are now connected.');
    } catch (error) {
      console.error('Error:', error);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleInitialize}
      disabled={isLoading}
      variant="default"
      size="lg"
    >
      {isLoading ? 'Initializing...' : 'Initialize Categories'}
    </Button>
  );
}
