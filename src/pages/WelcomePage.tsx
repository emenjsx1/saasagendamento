import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, ArrowRight, ArrowLeft, Check, DollarSign, FileText, UsersRound, Video, Mail, Hand, Smile } from 'lucide-react';
import { useSession } from '@/integrations/supabase/session-context';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { T } = useCurrency();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedUsage, setSelectedUsage] = useState<'individual' | 'team' | null>(null);
  const [selectedHelp, setSelectedHelp] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
    }
  }, [user, isSessionLoading, navigate]);

  // Opções de uso
  const usageOptions = [
    { 
      value: 'individual' as const, 
      label_pt: 'Por conta própria', 
      label_en: 'On my own',
      icon: <Hand className="w-6 h-6" />
    },
    { 
      value: 'team' as const, 
      label_pt: 'Com minha equipe', 
      label_en: 'With my team',
      icon: <Smile className="w-6 h-6" />
    },
  ];

  // Opções de ajuda
  const helpOptions = [
    { 
      value: 'schedule', 
      label_pt: 'Agendar reuniões', 
      label_en: 'Schedule meetings',
      icon: CalendarCheck 
    },
    { 
      value: 'payment', 
      label_pt: 'Coletar pagamentos', 
      label_en: 'Collect payment',
      icon: DollarSign 
    },
    { 
      value: 'contacts', 
      label_pt: 'Gerenciar registros de contatos', 
      label_en: 'Manage contact records',
      icon: FileText 
    },
    { 
      value: 'multiple', 
      label_pt: 'Reuniões com múltiplos participantes', 
      label_en: 'Meet with multiple attendees',
      icon: UsersRound 
    },
    { 
      value: 'record', 
      label_pt: 'Gravar e transcrever reuniões', 
      label_en: 'Record and transcribe meetings',
      icon: Video 
    },
    { 
      value: 'automate', 
      label_pt: 'Automatizar e-mails pré/pós reunião', 
      label_en: 'Automate pre/post meeting emails',
      icon: Mail 
    },
  ];

  const handleNext = async () => {
    if (currentStep === 1 && !selectedUsage) {
      toast.error(T('Por favor, selecione uma opção', 'Please select an option'));
      return;
    }

    if (currentStep === 2) {
      // Salvar preferências do usuário
      if (user) {
        setIsSaving(true);
        try {
          // Salvar no perfil do usuário
          await supabase
            .from('profiles')
            .update({
              onboarding_completed: true,
              onboarding_usage: selectedUsage,
              onboarding_help: selectedHelp,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        } catch (error) {
          console.error('Erro ao salvar onboarding:', error);
        } finally {
          setIsSaving(false);
        }
      }
      
      // Ir para página de trial iniciado
      navigate('/trial-started');
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleHelp = (value: string) => {
    setSelectedHelp(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#0069FF]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header com Logo */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[#0069FF] dark:text-blue-400">
            <CalendarCheck className="h-6 w-6" />
            <span className="text-xl font-bold">AgenCode</span>
          </Link>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {T('PASSO', 'STEP')} {currentStep} {T('DE', 'OF')} 2
            </span>
            <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#0069FF] transition-all duration-300"
                style={{ width: `${(currentStep / 2) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-gray-200 dark:border-gray-700">
          <CardContent className="p-8 sm:p-12">
            {/* Step 1: Como planeja usar */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                    {T('Como você planeja usar o AgenCode?', 'How do you plan on using AgenCode?')}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {T('Suas respostas nos ajudarão a personalizar sua experiência de acordo com suas necessidades.', 'Your responses will help us tailor your experience to your needs.')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {usageOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelectedUsage(option.value)}
                        className={`
                          p-6 rounded-xl border-2 transition-all duration-200 text-left
                          ${selectedUsage === option.value
                            ? 'border-[#0069FF] bg-blue-50 dark:bg-blue-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-12 h-12 rounded-lg flex items-center justify-center
                            ${selectedUsage === option.value
                              ? 'bg-[#0069FF] text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }
                          `}>
                            {Icon}
                          </div>
                          <div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {T(option.label_pt, option.label_en)}
                            </div>
                          </div>
                          {selectedUsage === option.value && (
                            <div className="ml-auto">
                              <div className="w-6 h-6 rounded-full bg-[#0069FF] flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Como o AgenCode pode ajudar */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                    {T('Como o AgenCode pode ajudá-lo?', 'How can AgenCode help you?')}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {T('Selecione todas as opções que se aplicam:', 'Select all that apply:')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {helpOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedHelp.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleHelp(option.value)}
                        className={`
                          p-6 rounded-xl border-2 transition-all duration-200 text-left
                          ${isSelected
                            ? 'border-[#0069FF] bg-blue-50 dark:bg-blue-900/20 shadow-md'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }
                        `}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-12 h-12 rounded-lg flex items-center justify-center
                            ${isSelected
                              ? 'bg-[#0069FF] text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }
                          `}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {T(option.label_pt, option.label_en)}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="ml-auto">
                              <div className="w-6 h-6 rounded-full bg-[#0069FF] flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer com botões */}
            <div className="mt-12 flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {T('O AgenCode usará essas informações e as informações do seu calendário para personalizar sua experiência.', 'AgenCode will use this and your calendar information to customize your experience.')}{' '}
                <Link to="/about" className="text-[#0069FF] hover:underline">
                  {T('Saiba mais', 'Learn more')}
                </Link>
              </div>

              <div className="flex items-center gap-4">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="border-gray-300 dark:border-gray-600"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {T('Voltar', 'Back')}
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="bg-[#0069FF] hover:bg-[#0052CC] text-white px-8"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {T('Salvando...', 'Saving...')}
                    </>
                  ) : (
                    <>
                      {T('Próximo', 'Next')}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WelcomePage;

