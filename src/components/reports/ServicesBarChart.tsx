import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { Currency } from '@/utils/currency';

interface ServicesBarChartProps {
  data: { service_name: string; total_revenue: number; total_appointments: number }[];
  currentCurrency: Currency;
}

export const ServicesBarChart: React.FC<ServicesBarChartProps> = ({ data, currentCurrency }) => {
  const chartData = data.slice(0, 10).map((item) => ({
    ...item,
    service_name: item.service_name.length > 15 
      ? item.service_name.substring(0, 15) + '...' 
      : item.service_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="service_name" 
          stroke="#6b7280"
          angle={-45}
          textAnchor="end"
          height={100}
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
        <Bar dataKey="total_revenue" fill="#10b981" name="Receita" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

