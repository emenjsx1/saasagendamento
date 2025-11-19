import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap, DollarSign, Clock } from 'lucide-react';
import { SubscriptionConfig, useAdminSettings } from '@/hooks/use-admin-settings';
import { formatCurrency } from '@/lib/utils';

const SubscriptionSchema = z.object({
  trial_days: z.coerce.number().min(1, "Mínimo de 1 dia."),
  base_prices: z.object({
    weekly: z.coerce.number().min(0, "Preço não pode ser negativo."),
    monthly: z.coerce.number().min(0, "Preço não pode ser negativo."),
    annual: z.coerce.number().min(0, "Preço não pode ser negativo."),
  }),
});

type SubscriptionFormValues = z.infer<typeof SubscriptionSchema>;

interface SubscriptionConfigFormProps {
  initialConfig: SubscriptionConfig;
  updateSettings: (config: Partial<SubscriptionConfig>) => Promise<boolean>;
}

const SubscriptionConfigForm: React.FC<SubscriptionConfigFormProps> = ({ initialConfig, updateSettings }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(SubscriptionSchema),
    defaultValues: initialConfig,
  });
  
  useEffect(() => {
    form.reset(initialConfig);
  }, [initialConfig, form]);

  const onSubmit = async (values: SubscriptionFormValues) => {
    setIsSubmitting(true);
    await updateSettings(values);
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl"><Zap className="h-5 w-5 mr-2" /> Configurações de Assinatura Global</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Duração do Teste Gratuito */}
            <FormField
              control={form.control}
              name="trial_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><Clock className="h-4 w-4 mr-2" /> Duração do Teste Gratuito (dias)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preços Base */}
            <div className="space-y-4 border p-4 rounded-md bg-gray-50">
              <h4 className="font-semibold flex items-center"><DollarSign className="h-4 w-4 mr-2" /> Preços Base (MZN)</h4>
              <p className="text-xs text-muted-foreground">Estes são os preços base usados para calcular descontos nos planos.</p>
              
              <FormField
                control={form.control}
                name="base_prices.weekly"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semanal</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="base_prices.monthly"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensal</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="base_prices.annual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Anual</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Configurações de Assinatura'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SubscriptionConfigForm;