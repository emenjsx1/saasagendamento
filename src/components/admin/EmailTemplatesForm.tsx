import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, Save, Eye, Send } from 'lucide-react';
import { EmailTemplates, EmailTemplate } from '@/hooks/use-admin-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useEmailNotifications } from '@/hooks/use-email-notifications';

// Helper schema for a single template
const TemplateSchema = z.object({
  subject: z.string().min(5, "Assunto é obrigatório."),
  body: z.string().min(10, "Corpo do e-mail é obrigatório."),
});

// Main schema for all templates
const EmailTemplatesSchema = z.object({
  appointment_confirmed: TemplateSchema,
  appointment_pending: TemplateSchema,
  payment_reminder: TemplateSchema,
  trial_expiration: TemplateSchema,
});

type EmailTemplatesFormValues = z.infer<typeof EmailTemplatesSchema>;

interface EmailTemplatesFormProps {
  initialTemplates: EmailTemplates;
  updateSettings: (templates: Partial<EmailTemplates>) => Promise<boolean>;
}

const templateKeys: Array<keyof EmailTemplates> = [
  'appointment_pending',
  'appointment_confirmed',
  'payment_reminder',
  'trial_expiration',
];

const templateLabels: Record<keyof EmailTemplates, string> = {
  appointment_pending: 'Agendamento Pendente',
  appointment_confirmed: 'Agendamento Confirmado',
  payment_reminder: 'Lembrete de Pagamento',
  trial_expiration: 'Expiração de Teste',
};

const templatePlaceholders: Record<keyof EmailTemplates, string[]> = {
    appointment_pending: [
      '{{client_name}}', '{{client_code}}', '{{service_name}}', 
      '{{service_duration}}', '{{service_price}}', 
      '{{formatted_date}}', '{{formatted_time}}', '{{date}}', '{{time}}',
      '{{appointment_status}}', '{{appointment_id}}', '{{appointment_link}}',
      '{{business_logo_url}}', '{{business_primary_color}}', '{{business_name}}',
      '{{business_whatsapp}}', '{{business_address}}', '{{status_emoji}}', '{{status_text}}',
      '{{employee_name}}', '{{employee_phone}}', '{{employee_email}}'
    ],
    appointment_confirmed: [
      '{{client_name}}', '{{client_code}}', '{{service_name}}', 
      '{{service_duration}}', '{{service_price}}', 
      '{{formatted_date}}', '{{formatted_time}}', '{{date}}', '{{time}}',
      '{{appointment_status}}', '{{appointment_id}}', '{{appointment_link}}',
      '{{business_logo_url}}', '{{business_primary_color}}', '{{business_name}}',
      '{{business_whatsapp}}', '{{business_address}}', '{{status_emoji}}', '{{status_text}}'
    ],
    payment_reminder: [
      '{{plan_name}}', '{{price}}', '{{payment_link}}',
      '{{business_logo_url}}', '{{business_primary_color}}', '{{business_name}}',
      '{{business_whatsapp}}', '{{business_address}}'
    ],
    trial_expiration: [
      '{{days_left}}', '{{upgrade_link}}',
      '{{business_logo_url}}', '{{business_primary_color}}', '{{business_name}}',
      '{{business_whatsapp}}', '{{business_address}}'
    ],
};


const EmailTemplatesForm: React.FC<EmailTemplatesFormProps> = ({ initialTemplates, updateSettings }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof EmailTemplates>('appointment_pending');
  const { sendEmail } = useEmailNotifications();
  
  const form = useForm<EmailTemplatesFormValues>({
    resolver: zodResolver(EmailTemplatesSchema),
    defaultValues: initialTemplates,
  });
  
  useEffect(() => {
    form.reset(initialTemplates);
  }, [initialTemplates, form]);

  const onSubmit = async (values: EmailTemplatesFormValues) => {
    setIsSubmitting(true);
    await updateSettings(values);
    setIsSubmitting(false);
  };
  
  const handleTestEmail = async () => {
    const currentTemplate = form.getValues(activeTab);
    const testEmail = prompt("Para qual email você gostaria de enviar o teste?");
    
    if (!testEmail) return;
    
    // Simulação de substituição de placeholders
    let testBody = currentTemplate.body;
    // Placeholders de cliente e agendamento
    testBody = testBody.replace(/\{\{client_name\}\}/g, 'João Teste');
    testBody = testBody.replace(/\{\{client_code\}\}/g, 'CL12345');
    testBody = testBody.replace(/\{\{service_name\}\}/g, 'Corte de Cabelo');
    testBody = testBody.replace(/\{\{service_duration\}\}/g, '60');
    testBody = testBody.replace(/\{\{service_price\}\}/g, 'MT 250.00');
    testBody = testBody.replace(/\{\{formatted_date\}\}/g, '20/10/2024');
    testBody = testBody.replace(/\{\{formatted_time\}\}/g, '14:00');
    testBody = testBody.replace(/\{\{date\}\}/g, '20/10/2024');
    testBody = testBody.replace(/\{\{time\}\}/g, '14:00');
    testBody = testBody.replace(/\{\{appointment_status\}\}/g, 'pending');
    testBody = testBody.replace(/\{\{appointment_id\}\}/g, 'test-123');
    testBody = testBody.replace(/\{\{appointment_link\}\}/g, window.location.origin + '/confirmation/test-123');
    // Placeholders de negócio
    testBody = testBody.replace(/\{\{business_logo_url\}\}/g, 'https://via.placeholder.com/200x70?text=LOGO');
    testBody = testBody.replace(/\{\{business_primary_color\}15\}/g, 'rgba(22, 163, 74, 0.15)');
    testBody = testBody.replace(/\{\{business_primary_color\}08\}/g, 'rgba(22, 163, 74, 0.08)');
    testBody = testBody.replace(/\{\{business_primary_color\}20\}/g, 'rgba(22, 163, 74, 0.20)');
    testBody = testBody.replace(/\{\{business_primary_color\}30\}/g, 'rgba(22, 163, 74, 0.30)');
    testBody = testBody.replace(/\{\{business_primary_color\}40\}/g, 'rgba(22, 163, 74, 0.40)');
    testBody = testBody.replace(/\{\{business_primary_color\}dd\}/g, '#16a34add');
    testBody = testBody.replace(/\{\{business_primary_color\}d9\}/g, '#16a34ad9');
    testBody = testBody.replace(/\{\{business_primary_color\}e6\}/g, '#16a34ae6');
    testBody = testBody.replace(/\{\{business_primary_color\}\}/g, '#16a34a');
    testBody = testBody.replace(/\{\{business_name\}\}/g, 'Salão de Beleza Teste');
    testBody = testBody.replace(/\{\{business_whatsapp\}\}/g, '+258 84 123 4567');
    testBody = testBody.replace(/\{\{business_address\}\}/g, 'Maputo, Moçambique');
    // Placeholders de status
    testBody = testBody.replace(/\{\{status_emoji\}\}/g, '⏰');
    testBody = testBody.replace(/\{\{status_text\}\}/g, 'Pendente');
    // Placeholders de pagamento
    testBody = testBody.replace(/\{\{plan_name\}\}/g, 'Plano Mensal');
    testBody = testBody.replace(/\{\{price\}\}/g, 'MT 588.00');
    testBody = testBody.replace(/\{\{payment_link\}\}/g, window.location.origin + '/checkout');
    // Placeholders de trial
    testBody = testBody.replace(/\{\{days_left\}\}/g, '3');
    testBody = testBody.replace(/\{\{upgrade_link\}\}/g, window.location.origin + '/checkout');

    toast.info("Enviando e-mail de teste...");
    
    await sendEmail({
        to: testEmail,
        subject: `[TESTE] ${currentTemplate.subject}`,
        body: testBody,
    });
    
    toast.success(`E-mail de teste enviado para ${testEmail}. Verifique sua caixa de entrada.`);
  };

  const renderTemplateForm = (key: keyof EmailTemplates) => (
    <TabsContent value={key} key={key} className="mt-4 space-y-4">
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
        <p className="font-semibold mb-1">Placeholders disponíveis:</p>
        <code className="text-xs text-gray-700">{templatePlaceholders[key].join(', ')}</code>
      </div>
      
      <FormField
        control={form.control}
        name={`${key}.subject`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Assunto do E-mail</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name={`${key}.body`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Corpo do E-mail (HTML)</FormLabel>
            <FormControl>
              <Textarea {...field} rows={10} className="font-mono text-xs" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={handleTestEmail}>
            <Send className="h-4 w-4 mr-2" /> Testar E-mail
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" /> Salvar Template
        </Button>
      </div>
    </TabsContent>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl"><Mail className="h-5 w-5 mr-2" /> Gestão de Templates de E-mail</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as keyof EmailTemplates)}>
              <TabsList className="grid w-full grid-cols-4">
                {templateKeys.map(key => (
                  <TabsTrigger key={key} value={key}>{templateLabels[key]}</TabsTrigger>
                ))}
              </TabsList>
              
              {templateKeys.map(renderTemplateForm)}
              
            </Tabs>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default EmailTemplatesForm;