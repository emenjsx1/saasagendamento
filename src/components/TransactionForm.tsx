import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { useCurrency } from '@/contexts/CurrencyContext';

// Esquema de validação
const TransactionSchema = z.object({
  type: z.enum(['revenue', 'expense'], {
    required_error: "O tipo de transação é obrigatório.",
  }),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero."),
  description: z.string().min(3, "A descrição é obrigatória."),
  category: z.string().optional(), 
  date: z.string().min(1, "A data é obrigatória."),
});

type TransactionFormValues = z.infer<typeof TransactionSchema>;

interface TransactionFormProps {
  businessId: string;
  onSuccess: () => void;
}

const expenseCategories = [
  'Aluguel', 'Salários', 'Materiais', 'Marketing', 'Outros'
];

const TransactionForm: React.FC<TransactionFormProps> = ({ businessId, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtherCategorySelected, setIsOtherCategorySelected] = useState(false);
  const { currentCurrency } = useCurrency();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(TransactionSchema),
    defaultValues: {
      type: 'revenue',
      amount: 0,
      description: '',
      category: undefined,
      date: new Date().toISOString().substring(0, 10), // YYYY-MM-DD
    },
  });

  const transactionType = form.watch('type');

  const onSubmit = async (values: TransactionFormValues) => {
    setIsSubmitting(true);

    try {
      if (values.type === 'revenue') {
        const { error } = await supabase
          .from('revenues')
          .insert({
            business_id: businessId,
            amount: values.amount,
            description: values.description,
            revenue_date: values.date,
          });

        if (error) throw error;
        toast.success("Receita registrada com sucesso!");

      } else { // expense
        // Se 'category' for 'Outra', o campo de texto livre deve ter sido preenchido
        const finalCategory = values.category === 'Outra' ? form.getValues('description') : values.category;
        
        const { error } = await supabase
          .from('expenses')
          .insert({
            business_id: businessId,
            amount: values.amount,
            description: values.description,
            category: finalCategory,
            expense_date: values.date,
          });

        if (error) throw error;
        toast.success("Despesa registrada com sucesso!");
      }

      form.reset();
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao registrar transação: " + error.message);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleCategoryChange = (value: string) => {
    if (value === 'Outra') {
      setIsOtherCategorySelected(true);
      form.setValue('category', 'Outra'); // Mantém o valor 'Outra' no campo category
    } else {
      setIsOtherCategorySelected(false);
      form.setValue('category', value);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Transação</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="revenue">Receita (Entrada)</SelectItem>
                  <SelectItem value="expense">Despesa (Saída)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor ({currentCurrency.key})</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  {...field} 
                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Ex: Pagamento do cliente João" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {transactionType === 'expense' && (
          <>
            <FormItem>
              <FormLabel>Categoria da Despesa</FormLabel>
              <Select onValueChange={handleCategoryChange} defaultValue={form.watch('category')}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione ou adicione uma categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {expenseCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="Outra">Adicionar Nova Categoria...</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
            
            {isOtherCategorySelected && (
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Nova Categoria</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Software de Gestão" 
                        value={field.value === 'Outra' ? '' : field.value} // Limpa se for 'Outra'
                        onChange={e => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage>
                        A descrição da nova categoria será usada como nome da categoria.
                    </FormMessage>
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data da Transação</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Salvar Transação'
          )}
        </Button>
      </form>
    </Form>
  );
};

export default TransactionForm;