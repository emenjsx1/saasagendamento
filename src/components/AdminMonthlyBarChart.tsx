import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface ChartData {
  name: string; // Mês
  Receita: number;
}

interface AdminMonthlyBarChartProps {
  data: ChartData[];
  title: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-white border border-gray-200 shadow-lg rounded-md text-sm">
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} style={{ color: p.color }}>
            {`${p.name}: ${formatCurrency(p.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminMonthlyBarChart: React.FC<AdminMonthlyBarChartProps> = ({ data, title }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)} 
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Receita" fill="hsl(142.1 76.2% 36.3%)" name="Receita Total" /> {/* Verde */}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminMonthlyBarChart;