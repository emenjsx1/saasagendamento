import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Currency, CURRENCIES, DEFAULT_CURRENCY_KEY, getCurrency } from '@/utils/currency';

interface CurrencyContextType {
  currentCurrency: Currency;
  setCurrencyKey: (key: Currency['key']) => void;
  isEnglish: boolean;
  T: (ptText: string, enText: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'app_currency_key';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencyKey, setCurrencyKey] = useState<Currency['key']>(DEFAULT_CURRENCY_KEY);

  // Load currency from local storage on mount
  useEffect(() => {
    const storedKey = localStorage.getItem(CURRENCY_STORAGE_KEY) as Currency['key'];
    if (storedKey && CURRENCIES.some(c => c.key === storedKey)) {
      setCurrencyKey(storedKey);
    }
  }, []);

  // Persist currency when it changes
  const setCurrencyKeyAndPersist = (key: Currency['key']) => {
    setCurrencyKey(key);
    localStorage.setItem(CURRENCY_STORAGE_KEY, key);
  };

  const currentCurrency = useMemo(() => getCurrency(currencyKey), [currencyKey]);
  const isEnglish = currentCurrency.language === 'en';
  
  // Simple translation function
  const T = (ptText: string, enText: string): string => {
      return isEnglish ? enText : ptText;
  };

  const contextValue = useMemo(() => ({
    currentCurrency,
    setCurrencyKey: setCurrencyKeyAndPersist,
    isEnglish,
    T,
  }), [currentCurrency, isEnglish]);

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};