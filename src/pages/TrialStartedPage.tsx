import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, Check, ArrowRight, X, Sparkles, Clock, Shield, TrendingUp, Zap } from 'lucide-react';
import { useSession } from '@/integrations/supabase/session-context';
import { useCurrency } from '@/contexts/CurrencyContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/use-subscription';

const TrialStartedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: isSessionLoading } = useSession();
  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const { T } = useCurrency();
  const [isDismissed, setIsDismissed] = useState(false);
  const [userName, setUserName] = useState('');

  // Carregar nome do usuário
  useEffect(() => {
    const loadUserName = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .single();
        
        if (data?.first_name) {
          setUserName(data.first_name);
        }
      }
    };
    loadUserName();
  }, [user]);

  // Redirecionar se não estiver logado ou não tiver subscription trial
  useEffect(() => {
    if (!isSessionLoading && !user) {
      navigate('/login');
      return;
    }

    if (!isSubscriptionLoading && subscription) {
      // Se não for trial, redirecionar para dashboard
      if (subscription.status !== 'trial' && !subscription.is_trial) {
        navigate('/dashboard');
      }
    }
  }, [user, isSessionLoading, subscription, isSubscriptionLoading, navigate]);

  const handleContinueToTrial = () => {
    setIsDismissed(true);
    navigate('/dashboard');
  };

  const handleChoosePlan = () => {
    navigate('/choose-plan');
  };

  if (isSessionLoading || isSubscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-[#0069FF]" />
      </div>
    );
  }

  if (isDismissed) {
    return null;
  }

  const premiumFeatures = [
    {
      title_pt: 'Economize horas por semana',
      title_en: 'Save hours each week',
      description_pt: 'Agende reuniões ilimitadas e conecte com suas ferramentas favoritas.',
      description_en: 'Book unlimited meetings and connect with your favorite tools.',
    },
    {
      title_pt: 'Pareça profissional sempre',
      title_en: 'Look professional every time',
      description_pt: 'Personalize a marca e automatize lembretes e notificações de acompanhamento.',
      description_en: 'Customize branding and automate reminder & follow-up notifications.',
    },
    {
      title_pt: 'Cresça seu negócio',
      title_en: 'Grow your business',
      description_pt: 'Colete pagamentos, capture e qualifique leads, e convide membros da equipe.',
      description_en: 'Collect payments, source & qualify leads, and invite teammates.',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorativo - Estilo Calendly */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div className="w-full max-w-6xl relative z-10">
        {/* Header com Logo */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-[#0069FF] dark:text-blue-400">
            <CalendarCheck className="h-6 w-6" />
            <span className="text-xl font-bold">AgenCode</span>
          </Link>
          
          <button
            onClick={handleContinueToTrial}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Coluna Esquerda - Conteúdo */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                {T('Seu teste gratuito acabou de começar.', 'Your free trial just started.')} 🎉
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-6">
                {T('Explore agendamento premium pelos próximos 3 dias, grátis! Os planos pagos do AgenCode ajudam você:', 'Explore premium scheduling for the next 3 days, for free! Paid AgenCode plans help you:')}
              </p>
            </div>

            {/* Lista de Features */}
            <div className="space-y-4">
              {premiumFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#0069FF] flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                      {T(feature.title_pt, feature.title_en)}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {T(feature.description_pt, feature.description_en)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-gray-600 dark:text-gray-400">
              {T('Escolha seu plano hoje, ou continue para o teste gratuito sem compromisso financeiro.', 'Choose your plan today, or continue to the free trial with no financial commitment.')}
            </p>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleContinueToTrial}
                className="border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 px-6 py-3"
              >
                {T('Continuar para teste gratuito', 'Continue to free trial')}
              </Button>
              <Button
                onClick={handleChoosePlan}
                className="bg-[#0069FF] hover:bg-[#0052CC] text-white px-6 py-3 shadow-lg hover:shadow-xl"
              >
                {T('Escolher um plano agora', 'Choose a plan now')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Coluna Direita - Ilustração/Preview */}
          <div className="hidden lg:block relative">
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 shadow-2xl">
              {/* Preview do calendário */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#0069FF] flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">AgenCode</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{userName || T('Seu Nome', 'Your Name')}</div>
                  </div>
                </div>
                
                {/* Mini calendário */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-xs text-gray-500 dark:text-gray-400 py-1">
                      {day}
                    </div>
                  ))}
                  {[...Array(14)].map((_, i) => {
                    const day = i + 15;
                    const isAvailable = [15, 16, 17, 18, 19, 22, 23].includes(day);
                    return (
                      <div
                        key={i}
                        className={`
                          aspect-square flex items-center justify-center rounded text-xs
                          ${isAvailable 
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-[#0069FF] dark:text-blue-400 border border-blue-200 dark:border-blue-700'
                            : 'text-gray-300 dark:text-gray-600'
                          }
                        `}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ícones flutuantes */}
              <div className="absolute top-4 right-4 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#0069FF] dark:text-blue-400" />
              </div>
              <div className="absolute bottom-4 left-4 w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrialStartedPage;



