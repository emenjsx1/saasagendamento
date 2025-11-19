import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, Plus, Edit, Trash2, Briefcase } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/integrations/supabase/session-context';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

// Tipagem para os dados do serviço
interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

// Esquema de validação para o formulário de serviço
const ServiceSchema = z.object({
  name: z.string().min(1, "O nome do serviço é obrigatório."),
  duration_minutes: z.coerce.number().min(5, "A duração deve ser de pelo menos 5 minutos."),
  price: z.coerce.number().min(0, "O preço não pode ser negativo."),
});

type ServiceFormValues = z.infer<typeof ServiceSchema>;

const ServicesPage: React.FC = () => {
  const { user } = useSession();
  const { currentCurrency } = useCurrency();
  const [services, setServices] = useState<Service[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(ServiceSchema),
    defaultValues: {
      name: "",
      duration_minutes: 30,
      price: 0,
    },
  });

  // 1. Buscar Business ID e Serviços
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // 1.1 Buscar Business ID
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (businessError && businessError.code !== 'PGRST116') {
        toast.error("Erro ao carregar o negócio.");
        console.error(businessError);
        setIsLoading(false);
        return;
      }

      if (!businessData) {
        // Se não houver negócio cadastrado, redirecionar ou mostrar aviso
        setBusinessId(null);
        setIsLoading(false);
        return;
      }

      setBusinessId(businessData.id);

      // 1.2 Buscar Serviços
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessData.id)
        .order('name', { ascending: true });

      if (servicesError) {
        toast.error("Erro ao carregar serviços.");
        console.error(servicesError);
      } else {
        setServices(servicesData as Service[]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [user]);

  // Função para abrir o modal de edição/criação
  const openModal = (service: Service | null = null) => {
    setEditingService(service);
    if (service) {
      form.reset({
        name: service.name,
        duration_minutes: service.duration_minutes,
        price: service.price,
      });
    } else {
      form.reset({
        name: "",
        duration_minutes: 30,
        price: 0,
      });
    }
    setIsModalOpen(true);
  };

  // 2. Submissão do formulário (Criar ou Editar)
  const onSubmit = async (values: ServiceFormValues) => {
    if (!businessId) {
      toast.error("Por favor, cadastre seu negócio primeiro.");
      return;
    }
    setIsSubmitting(true);

    const serviceData = {
      business_id: businessId,
      name: values.name,
      duration_minutes: values.duration_minutes,
      price: values.price,
    };

    let result;
    if (editingService) {
      // Atualizar
      result = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingService.id)
        .select()
        .single();
    } else {
      // Inserir
      result = await supabase
        .from('services')
        .insert(serviceData)
        .select()
        .single();
    }

    setIsSubmitting(false);

    if (result.error) {
      toast.error("Erro ao salvar o serviço: " + result.error.message);
      console.error(result.error);
    } else {
      // Atualiza a lista de serviços
      if (editingService) {
        setServices(services.map(s => s.id === editingService.id ? result.data as Service : s));
        toast.success("Serviço atualizado com sucesso!");
      } else {
        setServices([...services, result.data as Service]);
        toast.success("Serviço criado com sucesso!");
      }
      setIsModalOpen(false);
    }
  };

  // 3. Excluir Serviço
  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este serviço?")) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Erro ao excluir serviço: " + error.message);
      console.error(error);
    } else {
      setServices(services.filter(s => s.id !== id));
      toast.success("Serviço excluído com sucesso.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <Card className="p-6 text-center">
        <CardTitle className="text-xl mb-4">Negócio Não Cadastrado</CardTitle>
        <p className="mb-4">Você precisa cadastrar as informações do seu negócio antes de adicionar serviços.</p>
        <Button asChild>
          <a href="/register-business">Cadastrar Meu Negócio</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <Briefcase className="h-7 w-7 mr-3" />
        Gestão de Serviços
      </h1>
      
      <div className="flex justify-end">
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openModal(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingService ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Serviço</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Corte de Cabelo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (minutos)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço ({currentCurrency.key})</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serviços Cadastrados ({services.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum serviço cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Duração (min)</TableHead>
                    <TableHead className="text-right">Preço ({currentCurrency.key})</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-right">{service.duration_minutes}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(service.price, currentCurrency.key, currentCurrency.locale)}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => openModal(service)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDelete(service.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicesPage;