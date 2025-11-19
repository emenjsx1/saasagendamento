import { Button } from "@/components/ui/button";
import { CalendarCheck, Bell, Settings, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

// Componente de Card de Benefício Moderno
const BenefitCard: React.FC<{ icon: React.ReactNode; title_pt: string; title_en: string; description_pt: string; description_en: string }> = ({ icon, title_pt, title_en, description_pt, description_en }) => {
  const { T } = useCurrency();
  return (
    <div className="flex flex-col items-start text-left p-8 bg-white rounded-2xl shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.03] border border-gray-100 group">
      <div className="text-primary mb-4 p-3 rounded-full bg-primary/10 transition-colors duration-300 group-hover:bg-primary/20">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-gray-900">{T(title_pt, title_en)}</h3>
      <p className="text-gray-600 text-sm">{T(description_pt, description_en)}</p>
      <Link to="/checkout/trial" className="mt-4 text-sm font-semibold text-primary flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {T('Saiba Mais', 'Learn More')} <ArrowRight className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
};

const Index = () => {
  const { T } = useCurrency();
  
  const heroTitle = T('AGENCODES: A Próxima Geração em Agendamentos Inteligentes', 'AGENCODES: The Next Generation in Smart Scheduling');
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
        {/* Hero Section - Fundo com gradiente sutil e foco no conteúdo */}
        <section className="py-24 md:py-40 bg-gray-50 relative overflow-hidden">
          {/* Efeito de fundo sutil (futurista) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-primary/5 opacity-50"></div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight animate-fade-in-down">
              {heroTitle}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-4xl mx-auto animate-fade-in delay-200">
              {heroSubtitle}
            </p>
            <Button 
              size="lg" 
              asChild 
              className="shadow-2xl bg-primary hover:bg-primary/90 text-white transition-all duration-300 transform hover:scale-[1.05] animate-fade-in delay-400"
            >
              <Link to="/checkout/trial">{heroCta}</Link>
            </Button>
          </div>
        </section>

        {/* Benefits Section - Cards interativos */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">{benefitsTitle}</h2>
            <p className="text-xl text-gray-600 text-center mb-16">{benefitsSubtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <BenefitCard
                icon={<CalendarCheck className="h-8 w-8" />}
                title_pt="Agendamento 24/7"
                title_en="24/7 Booking"
                description_pt="Permita que seus clientes reservem horários a qualquer momento, otimizando sua taxa de conversão."
                description_en="Allow your clients to book appointments anytime, optimizing your conversion rate."
              />
              <BenefitCard
                icon={<Bell className="h-8 w-8" />}
                title_pt="Fluxo de Caixa Inteligente"
                title_en="Smart Cash Flow"
                description_pt="Monitore receitas e despesas em tempo real, garantindo a saúde financeira do seu negócio."
                description_en="Monitor revenues and expenses in real-time, ensuring the financial health of your business."
              />
              <BenefitCard
                icon={<Settings className="h-8 w-8" />}
                title_pt="Personalização Extrema"
                title_en="Extreme Customization"
                description_pt="Crie uma página de agendamento que reflete a identidade visual da sua marca com temas e cores."
                description_en="Create a booking page that reflects your brand's visual identity with themes and colors."
              />
            </div>
          </div>
        </section>
        
        {/* Pricing Section */}
        <PricingSection />

        {/* Final CTA Section */}
        <section className="py-16 bg-gray-950 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary-foreground">
              {ctaTitle}
            </h2>
            <Button size="lg" variant="default" asChild className="bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-shadow transform hover:scale-[1.05]">
              <Link to="/checkout/trial">{ctaButton}</Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;