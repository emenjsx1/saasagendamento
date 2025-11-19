import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Phone, Clock, Send, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SupportSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  description: z.string().min(10, "A descrição da dúvida deve ter pelo menos 10 caracteres."),
});

type SupportFormValues = z.infer<typeof SupportSchema>;

const SupportForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(SupportSchema),
    defaultValues: {
      name: "",
      email: "",
      description: "",
    },
  });

  const onSubmit = (values: SupportFormValues) => {
    setIsSubmitting(true);
    // Simulação de envio de API
    setTimeout(() => {
      console.log("Support Request Submitted:", values);
      toast.success("Sua solicitação de suporte foi enviada! Responderemos em breve.");
      form.reset();
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center"><Send className="h-5 w-5 mr-2" /> Formulário de Suporte</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="seu.email@exemplo.com" {...field} />
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
                  <FormLabel>Descrição da Dúvida</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva sua dúvida ou problema..." {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Enviar Suporte'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

const ContactInfo: React.FC = () => (
  <div className="space-y-6 p-6 bg-gray-100 rounded-lg shadow-inner">
    <h3 className="text-xl font-bold text-gray-800">Informações de Contato</h3>
    <div className="space-y-3">
      <div className="flex items-center text-gray-700">
        <Mail className="h-5 w-5 mr-3 text-primary" />
        <div>
          <p className="font-semibold">E-mail:</p>
          <p className="text-sm">suporte@exemplo.com</p>
        </div>
      </div>
      <div className="flex items-center text-gray-700">
        <Phone className="h-5 w-5 mr-3 text-primary" />
        <div>
          <p className="font-semibold">Telefone:</p>
          <p className="text-sm">+258 123 456 789</p>
        </div>
      </div>
      <div className="flex items-center text-gray-700">
        <Clock className="h-5 w-5 mr-3 text-primary" />
        <div>
          <p className="font-semibold">Horário de Atendimento:</p>
          <p className="text-sm">Segunda a Sexta, 09h às 18h</p>
        </div>
      </div>
    </div>
  </div>
);

const SupportSection: React.FC = () => {
  return (
    <section id="support" className="py-16 md:py-24 bg-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Precisa de ajuda?</h2>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Estamos aqui para resolver suas dúvidas! Entre em contato através do formulário ou dos nossos canais diretos.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <SupportForm />
          <ContactInfo />
        </div>
      </div>
    </section>
  );
};

export default SupportSection;