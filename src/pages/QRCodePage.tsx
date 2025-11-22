import React, { useRef, useState } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { useBusiness } from '@/hooks/use-business';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Copy, Link as LinkIcon, QrCode, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/contexts/CurrencyContext';
import { cn } from '@/lib/utils';

const QRCodePage: React.FC = () => {
  const { business, isLoading, businessSlug } = useBusiness();
  const { T } = useCurrency();
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Construir URL pública do negócio
  const bookingUrl = businessSlug 
    ? `${window.location.origin}/book/${businessSlug}?src=qr_porta`
    : null;

  const handleCopyLink = async () => {
    if (!bookingUrl) {
      toast.error(T('Link ainda não disponível.', 'Link not available yet.'));
      return;
    }

    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      toast.success(T('Link copiado para a área de transferência!', 'Link copied to clipboard!'));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error(T('Erro ao copiar link.', 'Error copying link.'));
      console.error(error);
    }
  };

  const handleDownloadQR = () => {
    if (!bookingUrl) return;

    try {
      // Buscar o canvas do QRCodeCanvas (ele renderiza um canvas diretamente)
      const canvasElement = qrCanvasRef.current?.querySelector('canvas') as HTMLCanvasElement | null;
      
      if (canvasElement) {
        // Usar o canvas diretamente do QRCodeCanvas
        const padding = 50;
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = canvasElement.width + (padding * 2);
        finalCanvas.height = canvasElement.height + (padding * 2);
        const ctx = finalCanvas.getContext('2d');
        
        if (!ctx) {
          toast.error(T('Erro ao criar canvas.', 'Error creating canvas.'));
          return;
        }

        // Desenhar fundo branco
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        
        // Desenhar QR Code no centro
        ctx.drawImage(canvasElement, padding, padding);
        
        // Converter para blob e download
        finalCanvas.toBlob((blob) => {
          if (!blob) {
            toast.error(T('Erro ao gerar imagem.', 'Error generating image.'));
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${business?.name?.replace(/\s+/g, '-').toLowerCase() || 'qr-code'}-agendamento.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          toast.success(T('QR Code baixado com sucesso!', 'QR Code downloaded successfully!'));
        }, 'image/png', 1.0);
      } else {
        // Fallback: tentar converter o SVG
        const svgElement = qrRef.current?.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${business?.name?.replace(/\s+/g, '-').toLowerCase() || 'qr-code'}-agendamento.svg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success(T('QR Code baixado como SVG!', 'QR Code downloaded as SVG!'));
        } else {
          toast.error(T('QR Code não encontrado.', 'QR Code not found.'));
        }
      }
    } catch (error) {
      console.error('Erro ao baixar QR Code:', error);
      toast.error(T('Erro ao baixar QR Code.', 'Error downloading QR Code.'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!business || !businessSlug || !bookingUrl) {
    return (
      <div className="space-y-4 sm:space-y-6 pb-6">
        <Card className="border-2 border-gray-300 rounded-3xl shadow-2xl bg-white">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 mb-4">
              {T('Você precisa criar um negócio primeiro.', 'You need to create a business first.')}
            </p>
            <Button asChild className="bg-black hover:bg-gray-900 text-white">
              <a href="/register-business">
                {T('Criar Negócio', 'Create Business')}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div className="w-full rounded-3xl bg-gradient-to-r from-black via-gray-900 to-gray-800 text-white p-4 sm:p-6 md:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <QrCode className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
              {T('Divulgação do seu negócio', 'Promote your business')}
            </h1>
            <p className="text-gray-300 mt-1 text-xs sm:text-sm md:text-base">
              {T('Use o link e o QR Code abaixo para divulgar sua página de agendamento', 'Use the link and QR Code below to promote your booking page')}
            </p>
          </div>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Card do QR Code */}
        <Card className="border-2 border-gray-300 rounded-3xl shadow-2xl bg-white">
          <CardHeader className="pb-4 p-4 sm:p-6 border-b-2 border-gray-200">
            <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 mb-1">
              {T('QR Code de Agendamento', 'Booking QR Code')}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              {T('Escaneie este código para acessar sua página de agendamento', 'Scan this code to access your booking page')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col items-center gap-6">
              {/* QR Code */}
              <div 
                ref={qrRef}
                className="p-6 bg-white rounded-2xl border-2 border-gray-200 shadow-lg"
              >
                <QRCodeSVG
                  value={bookingUrl}
                  size={280}
                  level="H"
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                />
              </div>
              
              {/* Canvas invisível para download */}
              <div ref={qrCanvasRef} className="hidden">
                <QRCodeCanvas
                  value={bookingUrl}
                  size={800}
                  level="H"
                  includeMargin={true}
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                />
              </div>

              {/* Nome do negócio */}
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 mb-1">
                  {business.name}
                </p>
                <p className="text-sm text-gray-600">
                  {T('Página de Agendamento', 'Booking Page')}
                </p>
              </div>

              {/* Botão de Download */}
              <Button
                onClick={handleDownloadQR}
                className="w-full bg-black hover:bg-gray-900 text-white font-semibold shadow-lg"
                size="lg"
              >
                <Download className="mr-2 h-5 w-5" />
                {T('Baixar QR Code (PNG)', 'Download QR Code (PNG)')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card do Link Público */}
        <Card className="border-2 border-gray-300 rounded-3xl shadow-2xl bg-white">
          <CardHeader className="pb-4 p-4 sm:p-6 border-b-2 border-gray-200">
            <CardTitle className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              {T('Link Público de Agendamento', 'Public Booking Link')}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              {T('Compartilhe este link com seus clientes', 'Share this link with your clients')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Link */}
            <div className="p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {T('URL da página:', 'Page URL:')}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-900 break-all font-mono bg-white px-3 py-2 rounded-lg border border-gray-300 flex-1">
                  {bookingUrl}
                </p>
              </div>
            </div>

            {/* Botão Copiar */}
            <Button
              onClick={handleCopyLink}
              className={cn(
                "w-full font-semibold shadow-lg transition-all",
                copied
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-black hover:bg-gray-900 text-white"
              )}
              size="lg"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  {T('Link Copiado!', 'Link Copied!')}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-5 w-5" />
                  {T('Copiar Link', 'Copy Link')}
                </>
              )}
            </Button>

            {/* Informações adicionais */}
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {T(
                  '💡 Dica: Imprima este QR Code e coloque na porta, balcão, cartão de visita ou banner. Ao escanear, o cliente será levado diretamente para sua página de agendamento.',
                  '💡 Tip: Print this QR Code and place it on your door, counter, business card or banner. When scanned, the client will be taken directly to your booking page.'
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QRCodePage;

