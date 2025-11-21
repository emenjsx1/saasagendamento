import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AppointmentsByDayChartProps {
  data: { date: string; appointments_count: number }[];
}

export const AppointmentsByDayChart: React.FC<AppointmentsByDayChartProps> = ({ data }) => {
  const chartData = data.map((item) => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 12px',
          }}
        />
        <Legend />
        <Bar dataKey="appointments_count" fill="#3b82f6" name="Agendamentos" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

