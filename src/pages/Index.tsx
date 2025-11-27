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
      className="relative flex flex-col items-start text-left p-4 sm:p-5 md:p-6 lg:p-8 bg-white rounded-xl sm:rounded-2xl shadow-lg transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] border border-black/10 group overflow-hidden animate-slide-in-bottom"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Efeito de brilho animado no hover */}
      <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%]"></div>
      
      {/* Borda sutil no hover */}
      <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-black/0 group-hover:border-black/20 transition-all duration-500"></div>
      
      <div className="relative z-10 w-full">
        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-black/5 transition-all duration-300 group-hover:bg-black/10 group-hover:scale-110 group-hover:rotate-3">
          <div className="text-black animate-float-y">
            {icon}
          </div>
        </div>
        <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold mb-1.5 sm:mb-2 md:mb-3 text-black transition-all duration-300 group-hover:scale-105">
          {T(title_pt, title_en)}
        </h3>
        <p className="text-gray-600 text-xs sm:text-sm md:text-base leading-relaxed mb-2 sm:mb-3 md:mb-4 group-hover:text-gray-800 transition-colors">{T(description_pt, description_en)}</p>
        <Link 
          to="/register" 
          className="mt-2 sm:mt-3 text-xs font-semibold text-black flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-2 border-b border-black/0 group-hover:border-black/30 pb-1"
        >
          {T('Saiba Mais', 'Learn More')} 
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2 transform group-hover:translate-x-1 transition-transform group-hover:scale-110" />
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
        <section className="relative py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20 bg-gradient-to-br from-white via-gray-50 to-white overflow-hidden">
          {/* Grid pattern animado com movimento */}
          <div className="absolute inset-0 grid-pattern opacity-30 animate-gradient-move"></div>
          
          {/* Partículas flutuantes animadas */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-black/10 rounded-full animate-particle-float"
              style={{
                left: `${15 + i * 15}%`,
                bottom: '-20px',
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${10 + i * 2}s`,
              }}
            />
          ))}
          
          {/* Círculos flutuantes decorativos */}
          <div className="absolute top-20 left-10 w-32 h-32 bg-black/5 rounded-full blur-xl animate-float-y"></div>
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-black/5 rounded-full blur-xl animate-float-x" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-black/5 rounded-full blur-lg animate-rotate-slow"></div>
          
          {/* Linhas de energia animadas */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/10 to-transparent animate-shimmer"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/10 to-transparent animate-shimmer" style={{ animationDelay: '1s' }}></div>
          
          {/* Ondas decorativas */}
          <div className="absolute top-1/4 right-0 w-64 h-64 border-2 border-black/5 rounded-full animate-pulse-scale"></div>
          <div className="absolute bottom-1/4 left-0 w-48 h-48 border-2 border-black/5 rounded-full animate-pulse-scale" style={{ animationDelay: '0.5s' }}></div>
          
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge "Plataforma de Nova Geração" */}
              <div className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 lg:px-6 lg:py-3 mb-5 md:mb-6 lg:mb-8 rounded-full bg-black text-white animate-slide-in-bottom hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-xl">
                <span className="w-2 h-2 md:w-2.5 md:h-2.5 bg-white rounded-full animate-pulse-scale"></span>
                <span className="text-xs sm:text-sm md:text-base font-medium">{T('Plataforma de Nova Geração', 'Next-Gen Platform')}</span>
              </div>
              
              {/* Título Principal */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold mb-4 sm:mb-5 md:mb-6 lg:mb-7 leading-tight animate-slide-up text-black relative group">
                <span className="relative z-10 bg-gradient-to-r from-black via-gray-900 to-black bg-clip-text text-transparent animate-gradient-move inline-block hover:scale-105 transition-transform duration-500">
                  {heroTitle}
                </span>
                <div className="absolute inset-0 blur-xl opacity-20 bg-gradient-to-r from-black via-gray-900 to-black animate-gradient-move group-hover:opacity-30 transition-opacity duration-500"></div>
              </h1>
              
              {/* Descrição */}
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-7 md:mb-8 lg:mb-10 max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '200ms' }}>
                {heroSubtitle}
              </p>
              
              {/* Botões CTA */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center animate-slide-up mb-6 sm:mb-8 md:mb-10" style={{ animationDelay: '400ms' }}>
                <Button 
                  asChild 
                  className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 text-sm sm:text-base md:text-lg font-bold bg-black hover:bg-gray-900 text-white transition-all duration-300 rounded-lg shadow-lg hover:shadow-2xl hover:scale-105 animate-bounce-slow group"
                >
                  <Link to="/register" className="flex items-center justify-center gap-2">
                    {heroCta}
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                
                <Button 
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 text-sm sm:text-base md:text-lg font-semibold border-2 border-black bg-white/0 hover:bg-black hover:text-white text-black transition-all duration-300 rounded-lg hover:scale-105 hover:shadow-lg"
                >
                  <Link to="/about">{T('Saiba Mais', 'Learn More')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* Cards de Estatísticas - Imediatamente após o hero */}
        <section className="py-3 sm:py-4 md:py-5 bg-white relative overflow-hidden">
          {/* Efeitos de fundo animados */}
          <div className="absolute inset-0 grid-pattern opacity-5 animate-gradient-move"></div>
          
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-4xl mx-auto">
              {[
                { value: '24/7', label_pt: 'Disponível', label_en: 'Available' },
                { value: '100%', label_pt: 'Seguro', label_en: 'Secure' },
                { value: '∞', label_pt: 'Escalável', label_en: 'Scalable' }
              ].map((stat, idx) => (
                <div 
                  key={idx} 
                  className="rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border border-gray-200 bg-white hover:border-black hover:shadow-lg transition-all duration-300 text-center animate-slide-in-bottom hover:scale-105 group"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black mb-0.5 sm:mb-1 group-hover:scale-110 transition-transform duration-300">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm md:text-base text-gray-600 group-hover:text-black transition-colors">{T(stat.label_pt, stat.label_en)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section - Cards Minimalistas */}
        <section className="py-6 sm:py-8 md:py-12 lg:py-16 bg-gray-50 relative overflow-hidden">
          {/* Grid pattern sutil com movimento */}
          <div className="absolute inset-0 grid-pattern opacity-20 animate-gradient-move"></div>
          
          {/* Partículas flutuantes */}
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 bg-black/10 rounded-full animate-particle-float"
              style={{
                left: `${20 + i * 20}%`,
                top: `${10 + i * 25}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${12 + i * 3}s`,
              }}
            />
          ))}
          
          {/* Círculos decorativos flutuantes */}
          <div className="absolute top-10 right-20 w-20 h-20 bg-black/5 rounded-full blur-md animate-float-y"></div>
          <div className="absolute bottom-20 left-20 w-16 h-16 bg-black/5 rounded-full blur-md animate-float-x" style={{ animationDelay: '1.5s' }}></div>
          
          {/* Efeitos de movimento sutis */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/5 to-transparent animate-shimmer"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/5 to-transparent animate-shimmer" style={{ animationDelay: '1s' }}></div>
          
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-6 sm:mb-8 md:mb-12 animate-fade-in-up">
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-extrabold mb-2 sm:mb-3 md:mb-4 text-black px-2">
                {benefitsTitle}
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-2">{benefitsSubtitle}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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
        
        {/* Business Types Section - Seção de Negócios Aumentada */}
        <section className="py-8 sm:py-10 md:py-12 lg:py-16 bg-white relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-10 animate-gradient"></div>
          
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16 animate-fade-in-up">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold mb-3 sm:mb-4 md:mb-5 text-black px-2">
                {T('Para Todos os Tipos de Negócios', 'For All Types of Businesses')}
              </h2>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-2">
                {T('Nossa plataforma se adapta perfeitamente ao seu segmento, oferecendo soluções personalizadas.', 'Our platform perfectly adapts to your segment, offering personalized solutions.')}
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
              {[
                { 
                  name_pt: 'Salões de Beleza', 
                  name_en: 'Beauty Salons', 
                  icon: '✂️',
                  description_pt: 'Gerencie cortes, tratamentos e colorações',
                  description_en: 'Manage cuts, treatments and colorings'
                },
                { 
                  name_pt: 'Clínicas Médicas', 
                  name_en: 'Medical Clinics', 
                  icon: '🏥',
                  description_pt: 'Agende consultas e exames com facilidade',
                  description_en: 'Schedule appointments and exams easily'
                },
                { 
                  name_pt: 'Barbearias', 
                  name_en: 'Barbershops', 
                  icon: '💈',
                  description_pt: 'Controle horários e serviços especializados',
                  description_en: 'Control schedules and specialized services'
                },
                { 
                  name_pt: 'Estúdios de Fitness', 
                  name_en: 'Fitness Studios', 
                  icon: '💪',
                  description_pt: 'Marque aulas e treinos personalizados',
                  description_en: 'Book classes and personalized training'
                },
                { 
                  name_pt: 'Consultórios', 
                  name_en: 'Consulting Offices', 
                  icon: '💼',
                  description_pt: 'Organize reuniões e sessões de consultoria',
                  description_en: 'Organize meetings and consulting sessions'
                },
                { 
                  name_pt: 'Spa & Bem-estar', 
                  name_en: 'Spa & Wellness', 
                  icon: '🧘',
                  description_pt: 'Administre massagens e terapias',
                  description_en: 'Manage massages and therapies'
                },
                { 
                  name_pt: 'Veterinárias', 
                  name_en: 'Veterinary', 
                  icon: '🐾',
                  description_pt: 'Agende atendimentos para pets',
                  description_en: 'Schedule pet appointments'
                },
                { 
                  name_pt: 'Fisioterapia', 
                  name_en: 'Physiotherapy', 
                  icon: '🦴',
                  description_pt: 'Gerencie sessões de reabilitação',
                  description_en: 'Manage rehabilitation sessions'
                },
                { 
                  name_pt: 'Odontologia', 
                  name_en: 'Dentistry', 
                  icon: '🦷',
                  description_pt: 'Organize consultas e procedimentos',
                  description_en: 'Organize consultations and procedures'
                },
                { 
                  name_pt: 'Psicologia', 
                  name_en: 'Psychology', 
                  icon: '🧠',
                  description_pt: 'Controle sessões terapêuticas',
                  description_en: 'Control therapeutic sessions'
                },
                { 
                  name_pt: 'Nutrição', 
                  name_en: 'Nutrition', 
                  icon: '🥗',
                  description_pt: 'Marque consultas nutricionais',
                  description_en: 'Book nutritional consultations'
                },
                { 
                  name_pt: 'E Muito Mais', 
                  name_en: 'And Much More', 
                  icon: '🌟',
                  description_pt: 'Adaptável a qualquer segmento',
                  description_en: 'Adaptable to any segment'
                }
              ].map((business, idx) => (
                <div
                  key={idx}
                  className="group relative p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 hover:border-black transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2 group-hover:scale-110 transition-transform duration-300">
                      {business.icon}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-black mb-1.5 group-hover:text-black transition-colors">
                      {T(business.name_pt, business.name_en)}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {T(business.description_pt, business.description_en)}
                    </p>
                  </div>
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-black/0 group-hover:bg-black/5 transition-colors duration-300 -z-10"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section - Seção de Depoimentos */}
        <section className="py-8 sm:py-10 md:py-12 lg:py-16 bg-gray-50 relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-10 animate-gradient"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/5 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-black/5 to-transparent"></div>
          
          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16 animate-fade-in-up">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold mb-3 sm:mb-4 md:mb-5 text-black px-2">
                {T('O Que Nossos Clientes Dizem', 'What Our Clients Say')}
              </h2>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-2">
                {T('Milhares de empresas já transformaram sua gestão com nossa plataforma.', 'Thousands of companies have already transformed their management with our platform.')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
              {[
                {
                  name_pt: 'Maria Silva',
                  name_en: 'Maria Silva',
                  business_pt: 'Salão Beleza & Arte',
                  business_en: 'Beauty & Art Salon',
                  role_pt: 'Proprietária',
                  role_en: 'Owner',
                  image: '👩',
                  text_pt: 'A plataforma revolucionou meu negócio! Agora meus clientes agendam 24/7 e eu tenho controle total sobre a agenda e finanças.',
                  text_en: 'The platform revolutionized my business! Now my clients book 24/7 and I have total control over the schedule and finances.',
                  rating: 5
                },
                {
                  name_pt: 'João Santos',
                  name_en: 'João Santos',
                  business_pt: 'Clínica Saúde Total',
                  business_en: 'Total Health Clinic',
                  role_pt: 'Médico',
                  role_en: 'Doctor',
                  image: '👨‍⚕️',
                  text_pt: 'Excelente ferramenta! Reduzi em 80% o tempo gasto com agendamentos telefônicos. Minha receita aumentou significativamente.',
                  text_en: 'Excellent tool! I reduced by 80% the time spent on phone appointments. My revenue increased significantly.',
                  rating: 5
                },
                {
                  name_pt: 'Ana Costa',
                  name_en: 'Ana Costa',
                  business_pt: 'Barbearia Moderna',
                  business_en: 'Modern Barbershop',
                  role_pt: 'Gerente',
                  role_en: 'Manager',
                  image: '👩‍💼',
                  text_pt: 'Muito fácil de usar e personalizar. Meus clientes adoram a experiência de agendamento online. Recomendo 100%!',
                  text_en: 'Very easy to use and customize. My clients love the online booking experience. I recommend 100%!',
                  rating: 5
                },
                {
                  name_pt: 'Carlos Oliveira',
                  name_en: 'Carlos Oliveira',
                  business_pt: 'Estúdio FitMax',
                  business_en: 'FitMax Studio',
                  role_pt: 'Personal Trainer',
                  role_en: 'Personal Trainer',
                  image: '💪',
                  text_pt: 'Perfeito para gerenciar múltiplos clientes e horários. O sistema de pagamentos integrado é um diferencial incrível.',
                  text_en: 'Perfect for managing multiple clients and schedules. The integrated payment system is an incredible differentiator.',
                  rating: 5
                },
                {
                  name_pt: 'Patrícia Lima',
                  name_en: 'Patrícia Lima',
                  business_pt: 'Spa Relax',
                  business_en: 'Relax Spa',
                  role_pt: 'Diretora',
                  role_en: 'Director',
                  image: '🧘',
                  text_pt: 'A interface é linda e profissional. Meus clientes ficam impressionados. O controle financeiro é preciso e detalhado.',
                  text_en: 'The interface is beautiful and professional. My clients are impressed. Financial control is accurate and detailed.',
                  rating: 5
                },
                {
                  name_pt: 'Roberto Ferreira',
                  name_en: 'Roberto Ferreira',
                  business_pt: 'Clínica Veterinária PetCare',
                  business_en: 'PetCare Veterinary Clinic',
                  role_pt: 'Veterinário',
                  role_en: 'Veterinarian',
                  image: '🐾',
                  text_pt: 'Solução completa para clínicas veterinárias. Agilizou muito nosso atendimento e aumentou a satisfação dos clientes.',
                  text_en: 'Complete solution for veterinary clinics. It greatly streamlined our service and increased customer satisfaction.',
                  rating: 5
                }
              ].map((testimonial, idx) => (
                <div
                  key={idx}
                  className="relative p-6 sm:p-8 bg-white rounded-2xl sm:rounded-3xl border-2 border-gray-200 hover:border-black transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] group animate-fade-in-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Stars Rating */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-500 text-lg">⭐</span>
                    ))}
                  </div>
                  
                  {/* Testimonial Text */}
                  <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed italic">
                    "{T(testimonial.text_pt, testimonial.text_en)}"
                  </p>
                  
                  {/* Author Info */}
                  <div className="flex items-center gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                    <div className="text-2xl sm:text-3xl flex-shrink-0">
                      {testimonial.image}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-black text-sm sm:text-base">
                        {T(testimonial.name_pt, testimonial.name_en)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {T(testimonial.role_pt, testimonial.role_en)} • {T(testimonial.business_pt, testimonial.business_en)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Hover Effect */}
                  <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-black/0 group-hover:bg-black/5 transition-colors duration-300 -z-10"></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <PricingSection />

        {/* Final CTA Section - Minimalista com Motion */}
        <section className="relative py-8 sm:py-10 md:py-12 lg:py-16 bg-black text-white overflow-hidden">
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
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold mb-4 md:mb-6 lg:mb-8 text-white animate-fade-in-up">
              {ctaTitle}
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 md:mb-10 lg:mb-12 max-w-2xl mx-auto px-2 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              {T('Junte-se a milhares de empresas que já transformaram sua gestão.', 'Join thousands of companies that have already transformed their management.')}
            </p>
            <Button 
              size="lg" 
              asChild 
              className="group relative px-8 sm:px-10 md:px-12 py-5 sm:py-6 md:py-7 text-base sm:text-lg md:text-xl font-bold bg-white text-black hover:bg-white/90 transition-all duration-300 transform hover:scale-110 shadow-xl hover:shadow-2xl overflow-hidden animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <Link to="/register">
                <span className="relative z-10 flex items-center gap-2 sm:gap-3">
                  {ctaButton}
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 transform group-hover:translate-x-2 transition-transform duration-300" />
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