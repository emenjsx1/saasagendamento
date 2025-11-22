import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface PlanLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limitType: 'appointments' | 'businesses';
  currentPlan: 'free' | 'standard' | 'teams' | null;
}

const PlanLimitModal: React.FC<PlanLimitModalProps> = ({
  open,
  onOpenChange,
  limitType,
  currentPlan,
}) => {
  const { T } = useCurrency();

  const getTitle = () => {
    if (limitType === 'appointments') {
      return T(
        'Você atingiu o limite do seu plano',
        'You have reached your plan limit'
      );
    } else {
      return T(
        'Limite de negócios atingido',
        'Business limit reached'
      );
    }
  };

  const getDescription = () => {
    if (limitType === 'appointments') {
      return T(
        'Você atingiu o limite de 30 agendamentos por mês do seu plano Free. Atualize para continuar criando agendamentos.',
        'You have reached the 30 appointments per month limit of your Free plan. Upgrade to continue creating appointments.'
      );
    } else {
      if (currentPlan === 'standard') {
        return T(
          'O plano Standard permite apenas 1 negócio. Criação de múltiplos negócios disponível apenas no plano Teams.',
          'The Standard plan allows only 1 business. Multiple businesses creation is available only in the Teams plan.'
        );
      } else {
        return T(
          'Criação de múltiplos negócios disponível apenas no plano Teams. Atualize para continuar.',
          'Multiple businesses creation is available only in the Teams plan. Upgrade to continue.'
        );
      }
    }
  };

  const getButtonText = () => {
    return T('Ver Planos', 'View Plans');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-black">
              {getTitle()}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-600 pt-2">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start gap-2">
          <Button
            asChild
            className="bg-black hover:bg-black/90 text-white"
            onClick={() => onOpenChange(false)}
          >
            <Link to="/pricing">
              {getButtonText()}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {T('Fechar', 'Close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlanLimitModal;
