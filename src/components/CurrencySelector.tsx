import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { CURRENCIES } from '@/utils/currency';

const CurrencySelector: React.FC = () => {
  const { currentCurrency, setCurrencyKey } = useCurrency();

  return (
    <Select 
      value={currentCurrency.key} 
      onValueChange={(key) => setCurrencyKey(key as any)}
    >
      <SelectTrigger className="w-[120px] h-8 text-sm">
        <SelectValue placeholder="Moeda" />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((currency) => (
          <SelectItem key={currency.key} value={currency.key}>
            {currency.flag} {currency.key} ({currency.label})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;