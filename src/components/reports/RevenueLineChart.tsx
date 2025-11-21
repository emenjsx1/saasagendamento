import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Currency } from '@/utils/currency';

interface RevenueLineChartProps {
  data: { date: string; revenue: number; appointments_count: number }[];
  currentCurrency: Currency;
}

export const RevenueLineChart: React.FC<RevenueLineChartProps> = ({ data, currentCurrency }) => {
  const chartData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => formatCurrency(value, currentCurrency.key, currentCurrency.locale, true)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
          formatter={(value: number) => formatCurrency(value, currentCurrency.key, currentCurrency.locale)}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="#10b981" 
          strokeWidth={2}
          name="Receita"
          dot={{ fill: '#10b981', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

