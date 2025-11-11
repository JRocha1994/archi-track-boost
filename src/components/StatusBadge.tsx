import { Badge } from '@/components/ui/badge';
import type { StatusEntrega, StatusAnalise } from '@/types';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: StatusEntrega | StatusAnalise;
  type: 'entrega' | 'analise';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const config = {
    'no-prazo': {
      label: 'No Prazo',
      className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
      icon: CheckCircle2,
    },
    atrasado: {
      label: 'Atrasado',
      className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
      icon: AlertCircle,
    },
    pendente: {
      label: 'Pendente',
      className: 'bg-muted text-muted-foreground border-border',
      icon: Clock,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge variant="outline" className={className}>
      <Icon className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}
