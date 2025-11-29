import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock, Star, MapPin, CheckCircle, ArrowRight, Smartphone, Zap, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/contexts/CurrencyContext';
import { refreshConsolidatedUserData } from '@/utils/user-consolidated-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mozambiqueProvinces, getCitiesByProvince } from '@/utils/mozambique-locations';

const RegisterSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres."),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres."),
  email: z.string().email("E-mail inválido."),
  phone: z.string().min(8, "Telefone inválido."),
  province: z.string().min(1, "Selecione sua província."),
  city: z.string().optional(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof RegisterSchema>;

export default function ClientLandingPage() {
  const navigate = useNavigate();
  const { T } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const availableCities = selectedProvince ? getCitiesByProvince(selectedProvince) : [];

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      province: "",
      city: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleRegister = async (values: RegisterFormValues) => {
    setIsSubmitting(true);

    try {
      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
      });

      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error("Falha ao criar usuário.");
      }

      // Atualizar perfil com nome, sobrenome, telefone, província e cidade
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: values.firstName,
          last_name: values.lastName,
          phone: values.phone,
          address: values.province + (values.city ? `, ${values.city}` : ''), // Armazenar província e cidade no campo address
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
      }

      // Atualizar tabela consolidada
      try {
        await refreshConsolidatedUserData(authData.user.id);
      } catch (error) {
        console.warn('⚠️ Erro ao atualizar tabela consolidada (não crítico):', error);
      }

      // Vincular agendamentos existentes por email
      try {
        const { data: linkData, error: linkError } = await supabase.rpc('link_appointments_to_user', {
          p_user_id: authData.user.id,
          p_email: values.email,
        });

        if (linkError) {
          console.warn('⚠️ Erro ao vincular agendamentos (não crítico):', linkError);
        } else if (linkData && linkData > 0) {
          toast.success(
            T(
              `${linkData} agendamento(s) foram vinculados à sua conta.`,
              `${linkData} appointment(s) were linked to your account.`
            ),
            { duration: 5000 }
          );
        }
      } catch (error) {
        console.warn('⚠️ Erro ao vincular agendamentos (não crítico):', error);
      }

      toast.success(T("Conta criada com sucesso! Redirecionando...", "Account created successfully! Redirecting..."));
      
      // Redirecionar para histórico do cliente
      setTimeout(() => {
        navigate('/client/history', { replace: true });
      }, 1500);

    } catch (error: any) {
      toast.error(error.message || T("Erro ao criar conta. Tente novamente.", "Error creating account. Please try again."));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: Calendar,
      title: T('Agende sem Sair de Casa', 'Book Without Leaving Home'),
      description: T('Marque seus serviços favoritos com apenas alguns cliques, sem precisar sair de casa.', 'Book your favorite services with just a few clicks, without leaving home.'),
    },
    {
      icon: Clock,
      title: T('Sem Fila, Sem Espera', 'No Queue, No Wait'),
      description: T('Evite filas e esperas. Escolha o horário perfeito para você e chegue na hora marcada.', 'Avoid queues and waiting. Choose the perfect time for you and arrive on time.'),
    },
    {
      icon: Star,
      title: T('Os Melhores Profissionais', 'The Best Professionals'),
      description: T('Acesse os melhores salões, clínicas e profissionais da sua cidade em um só lugar.', 'Access the best salons, clinics and professionals in your city in one place.'),
    },
    {
      icon: MapPin,
      title: T('Encontre Perto de Você', 'Find Near You'),
      description: T('Descubra negócios próximos à sua localização e economize tempo no deslocamento.', 'Discover businesses near your location and save time on travel.'),
    },
    {
      icon: Smartphone,
      title: T('Tudo no Seu Celular', 'Everything on Your Phone'),
      description: T('Gerencie todos os seus agendamentos pelo celular, a qualquer hora e em qualquer lugar.', 'Manage all your appointments on your phone, anytime, anywhere.'),
    },
    {
      icon: Shield,
      title: T('Seguro e Confiável', 'Safe and Reliable'),
      description: T('Seus dados estão protegidos e você pode confiar em nós para gerenciar seus agendamentos.', 'Your data is protected and you can trust us to manage your appointments.'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-semibold text-black">AgenCode</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/marketplace">
              <Button variant="ghost" className="hidden sm:flex">
                {T('Explorar Marketplace', 'Explore Marketplace')}
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">
                {T('Entrar', 'Log In')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                {T('Marque seus Serviços', 'Book Your Services')}
                <br />
                <span className="text-black bg-gradient-to-r from-black to-gray-800 bg-clip-text text-transparent">
                  {T('Sem Sair de Casa', 'Without Leaving Home')}
                </span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                {T(
                  'Acesse os melhores salões, clínicas e profissionais da sua cidade. Agende seus serviços favoritos com apenas alguns cliques, sem filas e sem espera.',
                  'Access the best salons, clinics and professionals in your city. Book your favorite services with just a few clicks, no queues and no waiting.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{T('Sem filas', 'No queues')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{T('Agendamento rápido', 'Quick booking')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{T('Os melhores profissionais', 'Best professionals')}</span>
              </div>
            </div>

            <div className="pt-4">
              <a href="#register">
                <Button size="lg" className="bg-black hover:bg-gray-900 text-white px-8 py-6 text-lg">
                  {T('Começar Agora', 'Get Started Now')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>

          {/* Right Side - Registration Form */}
          <div id="register" className="lg:sticky lg:top-24">
            <Card className="shadow-2xl border-0">
              <CardContent className="p-8">
                <div className="space-y-2 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {T('Crie sua Conta', 'Create Your Account')}
                  </h2>
                  <p className="text-gray-600">
                    {T('Comece a agendar seus serviços favoritos hoje mesmo', 'Start booking your favorite services today')}
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{T('Nome', 'First Name')}</FormLabel>
                            <FormControl>
                              <Input placeholder={T('João', 'John')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{T('Sobrenome', 'Last Name')}</FormLabel>
                            <FormControl>
                              <Input placeholder={T('Silva', 'Doe')} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('E-mail', 'Email')}</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="joao@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('Telefone', 'Phone')}</FormLabel>
                          <FormControl>
                            <Input placeholder="+258 84 123 4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Província */}
                    <FormField
                      control={form.control}
                      name="province"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {T('Província', 'Province')} *
                          </FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedProvince(value);
                              form.setValue('city', ''); // Reset city when province changes
                            }} 
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={T('Selecione sua província', 'Select your province')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mozambiqueProvinces.map((province) => (
                                <SelectItem key={province.name} value={province.name}>
                                  {province.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cidade */}
                    {selectedProvince && availableCities.length > 0 && (
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {T('Cidade', 'City')} {T('(Opcional)', '(Optional)')}
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={T('Selecione sua cidade', 'Select your city')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableCities.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('Senha', 'Password')}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{T('Confirmar Senha', 'Confirm Password')}</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-black hover:bg-gray-900 text-white py-6 text-lg"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {T('Criando conta...', 'Creating account...')}
                        </>
                      ) : (
                        <>
                          {T('Criar Conta Grátis', 'Create Free Account')}
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>

                    <p className="text-sm text-center text-gray-600 mt-4">
                      {T('Ao criar conta, você concorda com nossos', 'By creating an account, you agree to our')}{' '}
                      <Link to="/support" className="text-black hover:underline font-medium">
                        {T('Termos de Uso', 'Terms of Use')}
                      </Link>
                    </p>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {T('Por que escolher o AgenCode?', 'Why choose AgenCode?')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {T(
                'A maneira mais fácil e conveniente de agendar seus serviços favoritos',
                'The easiest and most convenient way to book your favorite services'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-black rounded-lg flex-shrink-0">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-2 text-gray-900">
                          {benefit.title}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="bg-gradient-to-r from-black to-gray-900 rounded-3xl p-12 md:p-16 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {T('Pronto para começar?', 'Ready to get started?')}
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            {T(
              'Junte-se a milhares de clientes que já estão agendando seus serviços de forma mais fácil e conveniente',
              'Join thousands of clients who are already booking their services more easily and conveniently'
            )}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#register">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100 px-8 py-6 text-lg">
                {T('Criar Conta Grátis', 'Create Free Account')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <Link to="/marketplace">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg">
                {T('Explorar Marketplace', 'Explore Marketplace')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                  <span className="text-black font-bold">A</span>
                </div>
                <span className="text-lg font-semibold">AgenCode</span>
              </div>
              <p className="text-gray-400 text-sm">
                {T(
                  'A melhor forma de agendar seus serviços favoritos',
                  'The best way to book your favorite services'
                )}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{T('Links Rápidos', 'Quick Links')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/marketplace" className="hover:text-white transition-colors">
                    {T('Marketplace', 'Marketplace')}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    {T('Sobre', 'About')}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    {T('Contato', 'Contact')}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{T('Suporte', 'Support')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/support" className="hover:text-white transition-colors">
                    {T('Central de Ajuda', 'Help Center')}
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    {T('Falar com Suporte', 'Contact Support')}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">{T('Conta', 'Account')}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    {T('Entrar', 'Log In')}
                  </Link>
                </li>
                <li>
                  <a href="#register" className="hover:text-white transition-colors">
                    {T('Criar Conta', 'Sign Up')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} AgenCode. {T('Todos os direitos reservados.', 'All rights reserved.')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

