import { PublicSubscriptionConfig } from '@/hooks/use-public-settings';

export interface Currency {
  key: 'MZN' | 'USD' | 'EUR' | 'BRL';
  label: string;
  locale: string;
  flag: string;
  language: 'pt' | 'en';
  weeklyBasePrice: number; // Base price for the weekly plan in this currency
}

export const CURRENCIES: Currency[] = [
  {
    key: 'MZN',
    label: 'Metical (MZ)',
    locale: 'pt-MZ',
    flag: '🇲🇿',
    language: 'pt',
    weeklyBasePrice: 147, // Base MZN price from existing defaults
  },
  {
    key: 'BRL',
    label: 'Real (BR)',
    locale: 'pt-BR',
    flag: '🇧🇷',
    language: 'pt',
    weeklyBasePrice: 19.90, // Base BRL price provided by user
  },
  {
    key: 'USD',
    label: 'US Dollar (US)',
    locale: 'en-US',
    flag: '🇺🇸',
    language: 'en',
    weeklyBasePrice: 2.99, // Base USD price provided by user
  },
  {
    key: 'EUR',
    label: 'Euro (EU)',
    locale: 'en-EU',
    flag: '🇪🇺',
    language: 'en',
    weeklyBasePrice: 2.75, // Base EUR price calculated by user
  },
];

export const DEFAULT_CURRENCY_KEY: Currency['key'] = 'MZN';

export const getCurrency = (key: Currency['key']) => {
    return CURRENCIES.find(c => c.key === key) || CURRENCIES[0];
};