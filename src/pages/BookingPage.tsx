import React from 'react';
import { useParams } from 'react-router-dom';

const BookingPage = () => {
  const { businessId } = useParams<{ businessId: string }>();
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Página de Agendamento</h1>
      <p className="mt-4">Agendando para o negócio ID: {businessId}</p>
    </div>
  );
};

export default BookingPage;