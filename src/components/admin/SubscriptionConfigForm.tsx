import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap, DollarSign, Clock, TrendingUp } from 'lucide-react';
import { SubscriptionConfig } from '@/hooks/use-admin-settings';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

// Taxas de conversão (divisores: MZN / taxa = moeda estrangeira)
const EXCHANGE_RATES = {
  USD: 67, // 1 MZN = 1/67 USD (ou seja, dividir MZN por 67)
  EUR: 77, // 1 MZN = 1/77 EUR
  BRL: 12, // 1 MZN = 1/12 BRL
};

const SubscriptionConfigForm: React.FC<SubscriptionConfigFormProps> = ({ initialConfig, updateSettings }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(SubscriptionSchema),
    defaultValues: initialConfig,
  });
  
  useEffect(() => {
    form.reset(initialConfig);
  }, [initialConfig, form]);

  // Observar mudanças nos valores MZN e calcular conversões
  const watchedValues = form.watch(['base_prices.weekly', 'base_prices.monthly', 'base_prices.annual']);

  const conversions = useMemo(() => {
    const [weekly, monthly, annual] = watchedValues;
    return {
      weekly: {
        USD: weekly ? (weekly / EXCHANGE_RATES.USD).toFixed(2) : '0.00',
        EUR: weekly ? (weekly / EXCHANGE_RATES.EUR).toFixed(2) : '0.00',
        BRL: weekly ? (weekly / EXCHANGE_RATES.BRL).toFixed(2) : '0.00',
      },
      monthly: {
        USD: monthly ? (monthly / EXCHANGE_RATES.USD).toFixed(2) : '0.00',
        EUR: monthly ? (monthly / EXCHANGE_RATES.EUR).toFixed(2) : '0.00',
        BRL: monthly ? (monthly / EXCHANGE_RATES.BRL).toFixed(2) : '0.00',
      },
      annual: {
        USD: annual ? (annual / EXCHANGE_RATES.USD).toFixed(2) : '0.00',
        EUR: annual ? (annual / EXCHANGE_RATES.EUR).toFixed(2) : '0.00',
        BRL: annual ? (annual / EXCHANGE_RATES.BRL).toFixed(2) : '0.00',
      },
    };
  }, [watchedValues]);

  const onSubmit = async (values: SubscriptionFormValues) => {
    setIsSubmitting(true);
    const success = await updateSettings(values);
    setIsSubmitting(false);
    if (!success) {
      toast.error('Erro ao salvar configurações.');
    }
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
            <div className="space-y-6 border p-6 rounded-lg bg-gradient-to-br from-gray-50 to-white shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center text-lg">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" /> 
                  Preços Base (MZN)
                </h4>
                <Badge variant="outline" className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Conversão automática
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Valores em Metical serão convertidos automaticamente para USD, EUR e BRL.</p>
              
              {/* Semanal */}
              <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
                <FormField
                  control={form.control}
                  name="base_prices.weekly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Plano Semanal</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            className="text-lg font-semibold"
                            placeholder="Ex: 1.00"
                          />
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="text-blue-600 font-medium">USD</div>
                              <div className="text-gray-700 font-semibold">${conversions.weekly.USD}</div>
                            </div>
                            <div className="p-2 bg-purple-50 rounded border border-purple-200">
                              <div className="text-purple-600 font-medium">EUR</div>
                              <div className="text-gray-700 font-semibold">€{conversions.weekly.EUR}</div>
                            </div>
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <div className="text-green-600 font-medium">BRL</div>
                              <div className="text-gray-700 font-semibold">R${conversions.weekly.BRL}</div>
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Mensal */}
              <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
                <FormField
                  control={form.control}
                  name="base_prices.monthly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Plano Mensal</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            className="text-lg font-semibold"
                            placeholder="Ex: 588.00"
                          />
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="text-blue-600 font-medium">USD</div>
                              <div className="text-gray-700 font-semibold">${conversions.monthly.USD}</div>
                            </div>
                            <div className="p-2 bg-purple-50 rounded border border-purple-200">
                              <div className="text-purple-600 font-medium">EUR</div>
                              <div className="text-gray-700 font-semibold">€{conversions.monthly.EUR}</div>
                            </div>
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <div className="text-green-600 font-medium">BRL</div>
                              <div className="text-gray-700 font-semibold">R${conversions.monthly.BRL}</div>
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Anual */}
              <div className="space-y-3 p-4 bg-white rounded-lg border border-gray-200">
                <FormField
                  control={form.control}
                  name="base_prices.annual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Plano Anual</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input 
                            type="number" 
                            step="0.01" 
                            {...field} 
                            onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            className="text-lg font-semibold"
                            placeholder="Ex: 7644.00"
                          />
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="p-2 bg-blue-50 rounded border border-blue-200">
                              <div className="text-blue-600 font-medium">USD</div>
                              <div className="text-gray-700 font-semibold">${conversions.annual.USD}</div>
                            </div>
                            <div className="p-2 bg-purple-50 rounded border border-purple-200">
                              <div className="text-purple-600 font-medium">EUR</div>
                              <div className="text-gray-700 font-semibold">€{conversions.annual.EUR}</div>
                            </div>
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <div className="text-green-600 font-medium">BRL</div>
                              <div className="text-gray-700 font-semibold">R${conversions.annual.BRL}</div>
                            </div>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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