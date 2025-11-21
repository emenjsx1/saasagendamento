import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Loader2, Mail, User, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import VirtualAssistant from '@/components/VirtualAssistant';

const ContactSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório."),
  email: z.string().email("E-mail inválido."),
  subject: z.string().min(5, "O assunto é obrigatório."),
  message: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres."),
});

type ContactFormValues = z.infer<typeof ContactSchema>;

const ContactSection: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(ContactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = (values: ContactFormValues) => {
    setIsSubmitting(true);
    // Simulação de envio de API
    setTimeout(() => {
      console.log("Contact Message Submitted:", values);
      toast.success("Mensagem enviada com sucesso! Entraremos em contato em breve.");
      form.reset();
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <section id="contact" className="py-16 md:py-24 bg-white relative overflow-hidden">
      {/* Grid pattern sutil */}
      <div className="absolute inset-0 grid-pattern opacity-20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl font-extrabold text-black mb-4">Entre em contato conosco!</h2>
          <p className="text-xl text-gray-600">
            Use o formulário abaixo para qualquer tipo de consulta comercial ou parceria.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Formulário de Contato */}
          <Card className="shadow-xl border border-black/10">
            <CardContent className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Seu nome" {...field} className="pl-10" />
                          </div>
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
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="seu.email@exemplo.com" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assunto</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Assunto da mensagem" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Sua mensagem detalhada..." {...field} rows={5} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-black hover:bg-black/90 text-white shadow-lg hover:shadow-xl transition-all duration-300" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Enviar Mensagem'
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Assistente Virtual */}
          <VirtualAssistant variant="inline" />
        </div>
      </div>
    </section>
  );
};

export default ContactSection;