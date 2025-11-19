import { MadeWithDyad } from "@/components/made-with-dyad";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Bell, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";

const BenefitCard: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
  <div className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-lg transition-transform hover:scale-[1.02] border-t-4 border-primary">
    <div className="text-primary mb-4">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
              Simplifique seus Agendamentos
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto">
              Organize sua agenda de forma simples e eficaz. Sem complicação, sem estresse.
            </p>
            <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow">
              <Link to="/signuppromo">Começar Agora</Link>
            </Button>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">Por que escolher nossa plataforma?</h2>
            <p className="text-xl text-gray-600 text-center mb-12">Agendamentos rápidos e eficientes para seu negócio!</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <BenefitCard
                icon={<CalendarCheck className="h-10 w-10" />}
                title="Agendamentos Rápidos"
                description="Seus clientes agendam em segundos, 24/7, sem precisar ligar ou mandar mensagem."
              />
              <BenefitCard
                icon={<Bell className="h-10 w-10" />}
                title="Notificações Automáticas"
                description="Reduza faltas com lembretes automáticos via WhatsApp (futuro) ou e-mail."
              />
              <BenefitCard
                icon={<Settings className="h-10 w-10" />}
                title="Página Personalizável"
                description="Crie uma página de agendamento com a cara do seu negócio, simples e profissional."
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
              Comece agora a organizar sua agenda!
            </h2>
            <Button size="lg" variant="secondary" asChild className="shadow-lg hover:shadow-xl transition-shadow">
              <Link to="/signuppromo">Criar Minha Conta Grátis</Link>
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