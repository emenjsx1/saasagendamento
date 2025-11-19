import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Bell, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import { useCurrency } from "@/contexts/CurrencyContext"; // Import useCurrency

const BenefitCard: React.FC<{ icon: React.ReactNode; title_pt: string; title_en: string; description_pt: string; description_en: string }> = ({ icon, title_pt, title_en, description_pt, description_en }) => {
  const { T } = useCurrency();
  return (
    <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-lg transition-transform hover:scale-[1.02] border-t-4 border-primary">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{T(title_pt, title_en)}</h3>
      <p className="text-gray-600">{T(description_pt, description_en)}</p>
    </div>
  );
};

const Index = () => {
  const { T } = useCurrency();
  
  const heroTitle = T('Simplifique seus Agendamentos', 'Simplify Your Bookings');
  const heroSubtitle = T('Organize sua agenda de forma simples e eficaz. Sem complicação, sem estresse.', 'Organize your schedule simply and effectively. No hassle, no stress.');
  const heroCta = T('Começar Agora', 'Start Now');
  
  const benefitsTitle = T('Por que escolher nossa plataforma?', 'Why choose our platform?');
  const benefitsSubtitle = T('Agendamentos rápidos e eficientes para seu negócio!', 'Fast and efficient bookings for your business!');
  
  const ctaTitle = T('Comece agora a organizar sua agenda!', 'Start organizing your schedule now!');
  const ctaButton = T('Criar Minha Conta Grátis', 'Create My Free Account');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              {heroTitle}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
              {heroSubtitle}
            </p>
            <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow">
              <Link to="/checkout/trial">{heroCta}</Link>
            </Button>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">{benefitsTitle}</h2>
            <p className="text-xl text-gray-600 text-center mb-12">{benefitsSubtitle}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <BenefitCard
                icon={<CalendarCheck className="h-10 w-10" />}
                title_pt="Agendamentos Rápidos"
                title_en="Quick Bookings"
                description_pt="Seus clientes agendam em segundos, 24/7, sem precisar ligar ou mandar mensagem."
                description_en="Your clients book in seconds, 24/7, without needing to call or message."
              />
              <BenefitCard
                icon={<Bell className="h-10 w-10" />}
                title_pt="Notificações Automáticas"
                title_en="Automatic Notifications"
                description_pt="Reduza faltas com lembretes automáticos via WhatsApp (futuro) ou e-mail."
                description_en="Reduce no-shows with automatic reminders via WhatsApp (future) or email."
              />
              <BenefitCard
                icon={<Settings className="h-10 w-10" />}
                title_pt="Página Personalizável"
                title_en="Customizable Page"
                description_pt="Crie uma página de agendamento com a cara do seu negócio, simples e profissional."
                description_en="Create a booking page that matches your business, simple and professional."
              />
            </div>
          </div>
        </section>
        
        {/* Pricing Section (Mantido na Index, mas com ID de âncora) */}
        <PricingSection />

        {/* Final CTA Section (Comece Agora) */}
        <section className="py-16 bg-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {ctaTitle}
            </h2>
            <Button size="lg" variant="secondary" asChild className="shadow-lg hover:shadow-xl transition-shadow">
              <Link to="/checkout/trial">{ctaButton}</Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
      <MadeWithDyad />
    </div>
  );
};

export default Index;