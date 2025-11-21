import { formatCurrency } from '@/lib/utils';
import { Currency } from '@/utils/currency';

interface BusinessData {
  logo_url?: string | null;
  theme_color?: string | null;
  name: string;
  phone?: string | null;
  address?: string | null;
}

interface AppointmentData {
  client_name: string;
  client_code: string;
  service_name: string;
  service_duration: number;
  service_price: number;
  formatted_date: string;
  formatted_time: string;
  appointment_status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  appointment_id: string;
  appointment_link?: string;
}

export const replaceEmailTemplate = (
  template: string,
  business: BusinessData,
  appointment: AppointmentData,
  currentCurrency: Currency
): string => {
  const primaryColor = business.theme_color || '#2563eb';
  const logoUrl = business.logo_url || 'https://via.placeholder.com/150x50?text=LOGO';
  const whatsapp = business.phone || 'N/A';
  const address = business.address || 'Não informado';
  const price = formatCurrency(appointment.service_price, currentCurrency.key, currentCurrency.locale);
  
  // Status em português
  const statusText = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  }[appointment.appointment_status] || 'Pendente';

  const statusEmoji = {
    pending: '⏰',
    confirmed: '✅',
    completed: '✅',
    cancelled: '❌',
  }[appointment.appointment_status] || '⏰';

  // Converter cor hex para rgba para usar em gradientes
  const hexToRgba = (hex: string, alpha: number): string => {
    // Remover # se presente
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) {
      // Se não for hex válido, retornar cor padrão
      return `rgba(37, 99, 235, ${alpha})`;
    }
    const r = parseInt(cleanHex.slice(0, 2), 16);
    const g = parseInt(cleanHex.slice(2, 4), 16);
    const b = parseInt(cleanHex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const primaryColorRgba15 = hexToRgba(primaryColor, 0.15);
  const primaryColorRgba08 = hexToRgba(primaryColor, 0.08);
  const primaryColorRgba20 = hexToRgba(primaryColor, 0.20);
  const primaryColorRgba40 = hexToRgba(primaryColor, 0.40);
  
  // Para o gradiente com opacidade, usar formato hex com alpha
  const primaryColorDD = primaryColor.length === 7 ? primaryColor + 'dd' : primaryColor;

  // Substituir placeholders - IMPORTANTE: substituir variações de cor ANTES da cor base
  let result = template
    // Substituir variações de cor primeiro (antes da cor base para evitar conflitos)
    .replace(/\{\{business_primary_color\}15\}/g, primaryColorRgba15)
    .replace(/\{\{business_primary_color\}08\}/g, primaryColorRgba08)
    .replace(/\{\{business_primary_color\}20\}/g, primaryColorRgba20)
    .replace(/\{\{business_primary_color\}30\}/g, hexToRgba(primaryColor, 0.30))
    .replace(/\{\{business_primary_color\}40\}/g, primaryColorRgba40)
    .replace(/\{\{business_primary_color\}dd\}/g, primaryColorDD)
    .replace(/\{\{business_primary_color\}d9\}/g, primaryColor.length === 7 ? primaryColor + 'd9' : primaryColor)
    .replace(/\{\{business_primary_color\}e6\}/g, primaryColor.length === 7 ? primaryColor + 'e6' : primaryColor)
    // Agora substituir a cor base
    .replace(/\{\{business_logo_url\}\}/g, logoUrl)
    .replace(/\{\{business_primary_color\}\}/g, primaryColor)
    .replace(/\{\{business_name\}\}/g, business.name)
    .replace(/\{\{business_whatsapp\}\}/g, whatsapp)
    .replace(/\{\{business_address\}\}/g, address)
    .replace(/\{\{client_name\}\}/g, appointment.client_name)
    .replace(/\{\{client_code\}\}/g, appointment.client_code)
    .replace(/\{\{service_name\}\}/g, appointment.service_name)
    .replace(/\{\{service_duration\}\}/g, appointment.service_duration.toString())
    .replace(/\{\{service_price\}\}/g, price)
    // Suporte para ambos os formatos: {{date}}/{{time}} e {{formatted_date}}/{{formatted_time}}
    .replace(/\{\{date\}\}/g, appointment.formatted_date)
    .replace(/\{\{time\}\}/g, appointment.formatted_time)
    .replace(/\{\{formatted_date\}\}/g, appointment.formatted_date)
    .replace(/\{\{formatted_time\}\}/g, appointment.formatted_time)
    .replace(/\{\{appointment_status\}\}/g, appointment.appointment_status)
    .replace(/\{\{appointment_id\}\}/g, appointment.appointment_id)
    .replace(/\{\{appointment_link\}\}/g, appointment.appointment_link || '#')
    .replace(/\{\{status_text\}\}/g, statusText)
    .replace(/\{\{status_emoji\}\}/g, statusEmoji);

  return result;
};

