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
import { useSubscription } from '@/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { currentCurrency, T } = useCurrency();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
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
        toast.error(T("Erro ao carregar o negócio.", "Error loading business."));
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
        toast.error(T("Erro ao carregar serviços.", "Error loading services."));
        console.error(servicesError);
      } else {
        setServices(servicesData as Service[]);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [user, subscription]);

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
      toast.error(T("Por favor, cadastre seu negócio primeiro.", "Please register your business first."));
      return;
    }
    
    // Validar se conta está ativa
    if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trial')) {
      toast.error(T("Sua conta precisa estar ativa para criar serviços. Complete o pagamento primeiro.", "Your account needs to be active to create services. Complete payment first."));
      navigate('/choose-plan');
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
      toast.error(T("Erro ao salvar o serviço: ", "Error saving service: ") + result.error.message);
      console.error(result.error);
    } else {
      // Atualiza a lista de serviços
      if (editingService) {
        setServices(services.map(s => s.id === editingService.id ? result.data as Service : s));
        toast.success(T("Serviço atualizado com sucesso!", "Service updated successfully!"));
      } else {
        setServices([...services, result.data as Service]);
        toast.success(T("Serviço criado com sucesso!", "Service created successfully!"));
      }
      setIsModalOpen(false);
    }
  };

  // 3. Excluir Serviço
  const handleDelete = async (id: string) => {
    if (!window.confirm(T("Tem certeza que deseja excluir este serviço?", "Are you sure you want to delete this service?"))) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(T("Erro ao excluir serviço: ", "Error deleting service: ") + error.message);
      console.error(error);
    } else {
      setServices(services.filter(s => s.id !== id));
      toast.success(T("Serviço excluído com sucesso.", "Service deleted successfully."));
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
      <Card className="p-6 text-center rounded-3xl border border-gray-200 shadow-xl">
        <CardTitle className="text-xl mb-4">{T('Negócio Não Cadastrado', 'Business Not Registered')}</CardTitle>
        <p className="mb-4">{T('Você precisa cadastrar as informações do seu negócio antes de adicionar serviços.', 'You need to register your business information before adding services.')}</p>
        <Button asChild className="rounded-2xl bg-black text-white">
          <a href="/register-business">{T('Cadastrar Meu Negócio', 'Register My Business')}</a>
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      <section className="rounded-3xl bg-gradient-to-br from-black via-gray-900 to-gray-700 text-white p-6 md:p-10 shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">{T('Catálogo premium', 'Premium Catalog')}</p>
            <h1 className="text-3xl md:text-4xl font-extrabold mt-2 flex items-center gap-3">
              <Briefcase className="h-8 w-8" />
              {T('Serviços e produtos', 'Services and Products')}
            </h1>
            <p className="text-gray-300 mt-3 text-sm md:text-base max-w-2xl">
              {T('Estruture seu portfólio com clareza. Ajuste duração, preço e destaque cada serviço para aumentar a conversão no agendamento online.', 'Structure your portfolio clearly. Adjust duration, price and highlight each service to increase conversion in online booking.')}
            </p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openModal(null)} className="rounded-2xl bg-white text-black hover:bg-white/90">
                <Plus className="h-4 w-4 mr-2" />
                {T('Adicionar serviço', 'Add Service')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold">
                  {editingService ? T('Editar serviço', 'Edit Service') : T('Adicionar novo serviço', 'Add New Service')}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{T('Nome do serviço', 'Service Name')}</FormLabel>
                        <FormControl>
                          <Input placeholder={T("Ex: Corte executivo", "Ex: Executive Cut")} {...field} className="rounded-2xl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="duration_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('Duração (minutos)', 'Duration (minutes)')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              className="rounded-2xl"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                            />
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
                          <FormLabel>{T('Preço', 'Price')} ({currentCurrency.key})</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              className="rounded-2xl"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button" className="rounded-2xl">
                        {T('Cancelar', 'Cancel')}
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting} className="rounded-2xl bg-black text-white">
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : T('Salvar serviço', 'Save Service')}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-2xl border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Serviços ativos', 'Active Services')}</p>
            <p className="text-3xl font-bold mt-2">{services.length}</p>
            <p className="text-gray-400 text-sm mt-1">{T('Itens disponíveis na página pública', 'Items available on public page')}</p>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Média de duração', 'Average Duration')}</p>
            <p className="text-3xl font-bold mt-2">
              {services.length
                ? `${Math.round(services.reduce((sum, s) => sum + s.duration_minutes, 0) / services.length)} ${T('min', 'min')}`
                : '—'}
            </p>
            <p className="text-gray-400 text-sm mt-1">{T('Tempo médio por atendimento', 'Average time per service')}</p>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{T('Ticket médio', 'Average Ticket')}</p>
            <p className="text-3xl font-bold mt-2">
              {services.length
                ? formatCurrency(
                    services.reduce((sum, s) => sum + s.price, 0) / services.length,
                    currentCurrency.key,
                    currentCurrency.locale
                  )
                : formatCurrency(0, currentCurrency.key, currentCurrency.locale)}
            </p>
            <p className="text-gray-400 text-sm mt-1">{T('Preço médio dos serviços', 'Average price of services')}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 rounded-3xl border border-gray-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">{T('Catálogo cadastrado', 'Registered Catalog')} ({services.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
                {T('Nenhum serviço cadastrado ainda. Clique em "Adicionar serviço" para começar.', 'No services registered yet. Click "Add Service" to start.')}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>{T('Nome', 'Name')}</TableHead>
                      <TableHead className="text-right">{T('Duração (min)', 'Duration (min)')}</TableHead>
                      <TableHead className="text-right">{T('Preço', 'Price')} ({currentCurrency.key})</TableHead>
                      <TableHead className="text-right">{T('Ações', 'Actions')}</TableHead>
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
                          <Button variant="outline" size="icon" className="rounded-full" onClick={() => openModal(service)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="icon" className="rounded-full" onClick={() => handleDelete(service.id)}>
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

        <Card className="rounded-3xl border border-gray-200 shadow-xl bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{T('Boas práticas de catálogo', 'Catalog Best Practices')}</CardTitle>
            <p className="text-sm text-gray-500">{T('Mantenha seu portfólio atrativo e fácil de contratar.', 'Keep your portfolio attractive and easy to hire.')}</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600">
            <div className="flex gap-3">
              <span className="h-2 w-2 rounded-full bg-black mt-2" />
              {T('Use descrições curtas e orientadas ao benefício do cliente.', 'Use short descriptions focused on client benefits.')}
            </div>
            <div className="flex gap-3">
              <span className="h-2 w-2 rounded-full bg-black mt-2" />
              {T('Defina durações coerentes para facilitar o encaixe de agenda.', 'Set consistent durations to facilitate schedule fitting.')}
            </div>
            <div className="flex gap-3">
              <span className="h-2 w-2 rounded-full bg-black mt-2" />
              {T('Atualize valores sempre que ajustar seus custos ou valor percebido.', 'Update prices whenever you adjust your costs or perceived value.')}
            </div>
            <div className="rounded-2xl border border-dashed border-gray-300 p-4 text-center text-gray-500">
              {T('Dica: destaque serviços premium com opções adicionais no checkout.', 'Tip: highlight premium services with additional options at checkout.')}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default ServicesPage;