import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

const VirtualAssistant: React.FC<{ variant?: 'floating' | 'inline' }> = ({ variant = 'floating' }) => {
  const { T } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: T('Olá! Sou o assistente virtual da AgenCode. Como posso ajudá-lo hoje?', 'Hello! I\'m AgenCode\'s virtual assistant. How can I help you today?'),
      sender: 'assistant',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const getResponse = async (userMessage: string): Promise<string> => {
    // Simular delay de resposta
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const lowerMessage = userMessage.toLowerCase();

    // Respostas inteligentes baseadas em palavras-chave
    if (lowerMessage.includes('preço') || lowerMessage.includes('price') || lowerMessage.includes('custo') || lowerMessage.includes('cost')) {
      return T(
        'Temos planos semanais, mensais e anuais com preços competitivos. Você pode ver todos os planos na seção de preços ou começar com um teste gratuito!',
        'We have weekly, monthly, and annual plans with competitive prices. You can see all plans in the pricing section or start with a free trial!'
      );
    }

    if (lowerMessage.includes('teste') || lowerMessage.includes('trial') || lowerMessage.includes('grátis') || lowerMessage.includes('free')) {
      return T(
        'Oferecemos um teste gratuito para você experimentar todas as funcionalidades. Clique em "Começar Teste Gratuito" para criar sua conta!',
        'We offer a free trial for you to try all features. Click "Start Free Trial" to create your account!'
      );
    }

    if (lowerMessage.includes('agendamento') || lowerMessage.includes('appointment') || lowerMessage.includes('booking')) {
      return T(
        'Nosso sistema permite criar agendamentos, gerenciar clientes, enviar lembretes por email e muito mais. Tudo em uma plataforma intuitiva!',
        'Our system allows you to create appointments, manage clients, send email reminders, and much more. All in an intuitive platform!'
      );
    }

    if (lowerMessage.includes('suporte') || lowerMessage.includes('support') || lowerMessage.includes('ajuda') || lowerMessage.includes('help')) {
      return T(
        'Estou aqui para ajudar! Você pode criar um ticket de suporte na área de tickets do dashboard ou enviar um email através da página de contato.',
        'I\'m here to help! You can create a support ticket in the tickets area of the dashboard or send an email through the contact page.'
      );
    }

    if (lowerMessage.includes('cadastro') || lowerMessage.includes('signup') || lowerMessage.includes('registro') || lowerMessage.includes('register')) {
      return T(
        'Para criar sua conta, clique em "Começar Teste Gratuito" na página inicial ou acesse /checkout/trial. O processo é rápido e simples!',
        'To create your account, click "Start Free Trial" on the home page or go to /checkout/trial. The process is quick and simple!'
      );
    }

    if (lowerMessage.includes('pagamento') || lowerMessage.includes('payment') || lowerMessage.includes('pagar') || lowerMessage.includes('pay')) {
      return T(
        'Aceitamos diversos métodos de pagamento. Você pode gerenciar sua assinatura e pagamentos na área de configurações do dashboard.',
        'We accept various payment methods. You can manage your subscription and payments in the dashboard settings area.'
      );
    }

    // Resposta padrão
    return T(
      'Entendo sua dúvida. Para obter informações mais detalhadas, recomendo verificar nossa página de preços, criar um ticket de suporte ou entrar em contato através do formulário na página de contato. Posso ajudá-lo com algo mais específico?',
      'I understand your question. For more detailed information, I recommend checking our pricing page, creating a support ticket, or contacting us through the form on the contact page. Can I help you with something more specific?'
    );
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    const response = await getResponse(inputValue);
    setIsTyping(false);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: response,
      sender: 'assistant',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (variant === 'floating') {
    return (
      <>
        {/* Botão flutuante do robô */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-black via-gray-900 to-black text-white shadow-2xl hover:shadow-black/50 transition-all duration-300 hover:scale-110 flex items-center justify-center group animate-float"
            aria-label={T('Abrir assistente virtual', 'Open virtual assistant')}
          >
            <Bot className="h-6 w-6 md:h-7 md:w-7 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
          </button>
        )}

        {/* Chat flutuante */}
        {isOpen && (
          <div
            className={cn(
              'fixed z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300',
              // Mobile: tamanho menor, posicionado no canto inferior direito
              'bottom-4 right-4 w-[calc(100vw-2rem)] max-w-sm h-[500px] max-h-[70vh]',
              // Desktop: tamanho maior
              'md:bottom-6 md:right-6 md:w-96 md:h-[600px]',
              isMinimized ? 'h-16' : ''
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-black via-gray-900 to-black text-white rounded-t-2xl">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs md:text-sm truncate">{T('Assistente Virtual', 'Virtual Assistant')}</h3>
                  <p className="text-[10px] md:text-xs text-white/80 truncate">{T('AgenCode', 'AgenCode')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label={T('Minimizar', 'Minimize')}
                >
                  <Minimize2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label={T('Fechar', 'Close')}
                >
                  <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-2 md:gap-3',
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.sender === 'assistant' && (
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-3 py-2 md:px-4 md:py-2',
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-black to-gray-900 text-white'
                            : 'bg-gray-100 text-gray-900'
                        )}
                      >
                        <p className="text-xs md:text-sm leading-relaxed">{message.text}</p>
                      </div>
                      {message.sender === 'user' && (
                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] md:text-xs font-bold text-gray-700">U</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-2 md:gap-3 justify-start">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-2xl px-3 py-2 md:px-4 md:py-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 md:p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={T('Digite sua mensagem...', 'Type your message...')}
                      className="flex-1 text-sm md:text-base"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isTyping}
                      size="icon"
                      className="bg-gradient-to-r from-black to-gray-900 hover:from-gray-900 hover:to-black flex-shrink-0"
                    >
                      <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </>
    );
  }

  // Variante inline (para página de contato)
  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-black via-gray-900 to-black text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">{T('Assistente Virtual', 'Virtual Assistant')}</h3>
            <p className="text-sm text-white/80">{T('Estou aqui para ajudar!', 'I\'m here to help!')}</p>
          </div>
        </div>
      </div>

      <div className="h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.sender === 'assistant' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3',
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-black to-gray-900 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
              </div>
              {message.sender === 'user' && (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-gray-700">U</span>
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={T('Digite sua mensagem...', 'Type your message...')}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isTyping}
              className="bg-gradient-to-r from-black to-gray-900 hover:from-gray-900 hover:to-black"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualAssistant;

