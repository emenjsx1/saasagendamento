import React from 'react';
import { useParams } from 'react-router-dom';

const ConfirmationPage = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <div className="text-center p-8 bg-white rounded-lg shadow-xl">
        <h1 className="text-4xl font-bold text-green-600 mb-4">Agendamento Confirmado!</h1>
        <p className="text-lg text-gray-700">Obrigado por agendar. ID do Agendamento: {appointmentId}</p>
      </div>
    </div>
  );
};

export default ConfirmationPage;