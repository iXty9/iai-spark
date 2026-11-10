import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logging';

/** Per-user switch: let the AI make HighLevel changes without asking first. */
export function WriteConfirmationsCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [skip, setSkip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('ghl_skip_write_confirmations')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) logger.error('Failed to load confirmation setting', error);
      setSkip(data?.ghl_skip_write_confirmations === true);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const onChange = async (next: boolean) => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ ghl_skip_write_confirmations: next })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      logger.error('Failed to save confirmation setting', error);
      toast({ title: 'Could not save', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    setSkip(next);
    toast({ title: next ? 'Confirmations turned off' : 'Confirmations turned on' });
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI changes in HighLevel</CardTitle>
        <CardDescription>
          By default the AI shows you a summary and waits for your OK before it creates, changes, sends or deletes anything in HighLevel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="skip-confirmations" className="flex-1">
            Skip confirmations
            <span className="block text-xs font-normal text-muted-foreground">
              The AI will make changes, including deletes and sending messages, without asking first.
            </span>
          </Label>
          <Switch
            id="skip-confirmations"
            checked={skip}
            disabled={loading || saving}
            onCheckedChange={onChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
