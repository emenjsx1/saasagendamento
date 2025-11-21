import { Button } from "@/components/ui/button";
import { CalendarCheck, Bell, Settings, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import VirtualAssistant from "@/components/VirtualAssistant";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

// Componente de Card de Benefício Minimalista Preto e Branco
const BenefitCard: React.FC<{ icon: React.ReactNode; title_pt: string; title_en: string; description_pt: string; description_en: string; delay?: number }> = ({ icon, title_pt, title_en, description_pt, description_en, delay = 0 }) => {
  const { T } = useCurrency();
  return (
    <div 
      className="relative flex flex-col items-start text-left p-5 sm:p-6 md:p-8 bg-white rounded-xl sm:rounded-2xl shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] border border-black/10 group overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Borda sutil no hover */}
      <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-black/0 group-hover:border-black/20 transition-all duration-500"></div>
      
      <div className="relative z-10 w-full">
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-black/5 transition-all duration-300 group-hover:bg-black/10 group-hover:scale-105">
          <div className="text-black">
            {icon}
          </div>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-black transition-all duration-300">
          {T(title_pt, title_en)}
        </h3>
        <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mb-3 sm:mb-4">{T(description_pt, description_en)}</p>
        <Link 
          to="/checkout/trial" 
          className="mt-3 sm:mt-4 text-xs sm:text-sm font-semibold text-black flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-2 border-b border-black/0 group-hover:border-black/30 pb-1"
        >
          {T('Saiba Mais', 'Learn More')} 
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

const Index = () => {
  const { T } = useCurrency();
  
  const heroTitle = T('A Próxima Geração em Agendamentos Inteligentes', 'The Next Generation in Smart Scheduling');
  const heroSubtitle = T('Organize sua agenda, gerencie finanças e cresça seu negócio com nossa plataforma futurista e intuitiva.', 'Organize your schedule, manage finances, and grow your business with our futuristic and intuitive platform.');
  const heroCta = T('Começar Teste Gratuito', 'Start Free Trial');
  
  const benefitsTitle = T('Funcionalidades Essenciais', 'Essential Features');
  const benefitsSubtitle = T('Ferramentas poderosas para otimizar cada aspecto do seu serviço.', 'Powerful tools to optimize every aspect of your service.');
  
  const ctaTitle = T('Pronto para o futuro da gestão?', 'Ready for the future of management?');
  const ctaButton = T('Criar Minha Conta Grátis', 'Create My Free Account');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section - Design Futurista e Movimentado */}
        <section className="relative py-16 sm:py-20 md:py-32 lg:py-40 bg-gradient-to-br from-white via-gray-50 to-white overflow-hidden particles-bg">
          {/* Grid pattern animado com movimento */}
          <div className="absolute inset-0 grid-pattern opacity-30 animate-gradient"></div>
          
          {/* Linhas de energia animadas */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/10 to-transparent animate-shimmer"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/10 to-transparent animate-shimmer" style={{ animationDelay: '1s' }}></div>
          
          {/* Efeitos de fundo futuristas e movimentados - mais dinâmicos */}
          <div className="absolute top-0 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-black/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-black/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-black/3 rounded-full blur-3xl animate-scale-pulse"></div>
          
          {/* Partículas flutuantes - mais partículas */}
          <div className="absolute top-20 left-10 w-2 h-2 bg-black/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-40 right-20 w-3 h-3 bg-black/15 rounded-full animate-float" style={{ animationDelay: '3s' }}></div>
          <div className="absolute bottom-40 left-20 w-2 h-2 bg-black/20 rounded-full animate-float" style={{ animationDelay: '2.5s' }}></div>
          <div className="absolute bottom-20 right-10 w-3 h-3 bg-black/15 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute top-1/3 left-1/3 w-1.5 h-1.5 bg-black/25 rounded-full animate-float" style={{ animationDelay: '4s' }}></div>
          <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-black/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
          
          {/* Efeitos de brilho em movimento */}
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-black/3 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute bottom-1/4 left-1/4 w-32 h-32 bg-black/3 rounded-full blur-2xl animate-float" style={{ animationDelay: '3.5s' }}></div>
          
          <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
            {/* Badge minimalista com animação melhorada */}
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6 md:mb-8 rounded-full bg-black text-white border border-black animate-fade-in-up hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-xl">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></span>
              <span className="text-[10px] sm:text-xs md:text-sm font-medium">{T('Plataforma de Nova Geração', 'Next-Gen Platform')}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold mb-3 sm:mb-4 md:mb-6 leading-[1.15] sm:leading-[1.1] md:leading-tight animate-slide-up text-black relative px-2">
              <span className="relative z-10 bg-gradient-to-r from-black via-gray-900 to-black bg-clip-text text-transparent animate-gradient inline-block">
                {heroTitle}
              </span>
              <div className="absolute inset-0 blur-xl opacity-20 bg-gradient-to-r from-black via-gray-900 to-black animate-gradient"></div>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-600 mb-6 sm:mb-8 md:mb-12 max-w-4xl mx-auto leading-relaxed px-2 animate-slide-up" style={{ animationDelay: '200ms' }}>
              {heroSubtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center animate-slide-up mb-8 sm:mb-12 md:mb-0" style={{ animationDelay: '400ms' }}>
              <Button 
                size="lg" 
                asChild 
                className="group relative w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-black via-gray-900 to-black hover:from-gray-900 hover:via-black hover:to-gray-900 text-white transition-all duration-500 transform hover:scale-110 shadow-2xl hover:shadow-black/50 overflow-hidden"
              >
                <Link to="/checkout/trial">
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {heroCta}
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 transform group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer"></div>
                  <div className="absolute inset-0 bg-white/5 animate-gradient"></div>
                </Link>
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                asChild
                className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-5 md:py-6 text-sm sm:text-base md:text-lg font-semibold border-2 border-black text-black hover:bg-black hover:text-white transition-all duration-300 transform hover:scale-105"
              >
                <Link to="/about">{T('Saiba Mais', 'Learn More')}</Link>
              </Button>
            </div>
            
            {/* Estatísticas rápidas com animações */}
            <div className="mt-8 sm:mt-12 md:mt-16 lg:mt-20 grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 lg:gap-8 max-w-4xl mx-auto animate-fade-in-up" style={{ animationDelay: '600ms' }}>
              {[
                { value: '24/7', label_pt: 'Disponível', label_en: 'Available' },
                { value: '100%', label_pt: 'Seguro', label_en: 'Secure' },
                { value: '∞', label_pt: 'Escalável', label_en: 'Scalable' }
              ].map((stat, idx) => (
                <div 
                  key={idx} 
                  className="glass-light rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 border border-black/10 hover:border-black/30 transition-all duration-300 hover:shadow-lg hover:scale-105 transform group cursor-pointer"
                  style={{ animationDelay: `${700 + idx * 100}ms` }}
                >
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                    {stat.value}
                  </div>
                  <div className="text-[10px] sm:text-xs md:text-sm text-gray-600">{T(stat.label_pt, stat.label_en)}</div>
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-black/0 group-hover:bg-black/5 transition-colors duration-300 -z-10"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section - Cards Minimalistas */}
        <section className="py-12 sm:py-16 md:py-24 lg:py-32 bg-gray-50 relative overflow-hidden">
          {/* Grid pattern sutil com movimento */}
          <div className="absolute inset-0 grid-pattern opacity-20 animate-gradient"></div>
          
          {/* Efeitos de movimento sutis */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/5 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/5 to-transparent"></div>
          
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-8 sm:mb-12 md:mb-16 animate-fade-in-up">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-2 sm:mb-4 text-black px-2">
                {benefitsTitle}
              </h2>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-2">{benefitsSubtitle}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8 lg:gap-10">
              <BenefitCard
                icon={<CalendarCheck className="h-8 w-8 sm:h-10 sm:w-10 text-black" />}
                title_pt="Agendamento 24/7"
                title_en="24/7 Booking"
                description_pt="Permita que seus clientes reservem horários a qualquer momento, otimizando sua taxa de conversão."
                description_en="Allow your clients to book appointments anytime, optimizing your conversion rate."
                delay={0}
              />
              <BenefitCard
                icon={<Bell className="h-8 w-8 sm:h-10 sm:w-10 text-black" />}
                title_pt="Fluxo de Caixa Inteligente"
                title_en="Smart Cash Flow"
                description_pt="Monitore receitas e despesas em tempo real, garantindo a saúde financeira do seu negócio."
                description_en="Monitor revenues and expenses in real-time, ensuring the financial health of your business."
                delay={200}
              />
              <BenefitCard
                icon={<Settings className="h-8 w-8 sm:h-10 sm:w-10 text-black" />}
                title_pt="Personalização Extrema"
                title_en="Extreme Customization"
                description_pt="Crie uma página de agendamento que reflete a identidade visual da sua marca com temas e cores."
                description_en="Create a booking page that reflects your brand's visual identity with themes and colors."
                delay={400}
              />
            </div>
          </div>
        </section>
        
        {/* Pricing Section */}
        <PricingSection />

        {/* Final CTA Section - Minimalista com Motion */}
        <section className="relative py-16 sm:py-20 md:py-32 bg-black text-white overflow-hidden">
          {/* Grid pattern animado */}
          <div className="absolute inset-0 grid-pattern-dark opacity-10 animate-gradient"></div>
          
          {/* Linhas de energia animadas */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ animationDelay: '1.5s' }}></div>
          
          {/* Efeitos de fundo minimalistas com movimento */}
          <div className="absolute top-0 left-0 w-full h-full opacity-5">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-white rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-white rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-72 md:h-72 bg-white/30 rounded-full blur-2xl animate-scale-pulse"></div>
          </div>
          
          {/* Partículas flutuantes */}
          <div className="absolute top-20 left-20 w-1.5 h-1.5 bg-white/40 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 right-20 w-2 h-2 bg-white/30 rounded-full animate-float" style={{ animationDelay: '2.5s' }}></div>
          <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white/50 rounded-full animate-sparkle"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 md:mb-8 text-white animate-fade-in-up">
              {ctaTitle}
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 mb-8 md:mb-12 max-w-2xl mx-auto px-2 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              {T('Junte-se a milhares de empresas que já transformaram sua gestão.', 'Join thousands of companies that have already transformed their management.')}
            </p>
            <Button 
              size="lg" 
              asChild 
              className="group relative px-8 sm:px-10 py-6 sm:py-7 text-base sm:text-lg font-bold bg-white text-black hover:bg-white/90 transition-all duration-300 transform hover:scale-110 shadow-xl hover:shadow-2xl overflow-hidden animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <Link to="/checkout/trial">
                <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                  {ctaButton}
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 transform group-hover:translate-x-2 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-shimmer"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
      
      {/* Assistente Virtual Flutuante */}
      <VirtualAssistant variant="floating" />
    </div>
  );
};

export default Index;