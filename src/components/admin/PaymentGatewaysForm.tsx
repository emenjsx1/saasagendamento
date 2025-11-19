import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CreditCard, Percent, ToggleLeft, ToggleRight } from 'lucide-react';
import { PaymentGatewayConfig } from '@/hooks/use-admin-settings';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const PaymentSchema = z.object({
  mpesa_active: z.boolean(),
  mpesa_fee_percent: z.coerce.number().min(0).max(100),
  emola_active: z.boolean(),
  emola_fee_percent: z.coerce.number().min(0).max(100),
  card_active: z.boolean(),
  card_fee_percent: z.coerce.number().min(0).max(100),
});

type PaymentFormValues = z.infer<typeof PaymentSchema>;

interface PaymentGatewaysFormProps {
  initialConfig: PaymentGatewayConfig;
  updateSettings: (config: Partial<PaymentGatewayConfig>) => Promise<boolean>;
}

const PaymentGatewaysForm: React.FC<PaymentGatewaysFormProps> = ({ initialConfig, updateSettings }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: initialConfig,
  });
  
  useEffect(() => {
    form.reset(initialConfig);
  }, [initialConfig, form]);

  const onSubmit = async (values: PaymentFormValues) => {
    setIsSubmitting(true);
    await updateSettings(values);
    setIsSubmitting(false);
  };
  
  const renderGatewayField = (name: 'mpesa' | 'emola' | 'card', label: string) => (
    <div className="border p-4 rounded-md bg-white shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={`${name}_active`} className="font-semibold text-lg">{label}</Label>
        <FormField
          control={form.control}
          name={`${name}_active`}
          render={({ field }) => (
            <div className="flex items-center space-x-2">
              <Label htmlFor={`${name}_active`}>{field.value ? 'Ativo' : 'Inativo'}</Label>
              <Switch
                id={`${name}_active`}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </div>
          )}
        />
      </div>
      
      <FormField
        control={form.control}
        name={`${name}_fee_percent`}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center text-sm"><Percent className="h-4 w-4 mr-2" /> Taxa de Transação (%)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                step="0.1" 
                placeholder="0.0" 
                {...field} 
                onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                disabled={!form.watch(`${name}_active`)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {/* Placeholder for API Key management */}
      <p className="text-xs text-muted-foreground pt-2">
        * As chaves de API devem ser configuradas separadamente nas variáveis de ambiente do Supabase.
      </p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl"><CreditCard className="h-5 w-5 mr-2" /> Integrações de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {renderGatewayField('mpesa', 'M-Pesa')}
            {renderGatewayField('emola', 'e-Mola')}
            {renderGatewayField('card', 'Cartão de Crédito')}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Configurações de Pagamento'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PaymentGatewaysForm;