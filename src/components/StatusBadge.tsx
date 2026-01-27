import { Badge } from '@/components/ui/badge';
import type { StatusEntrega, StatusAnalise } from '@/types';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: StatusEntrega | StatusAnalise;
  type: 'entrega' | 'analise';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const config: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    'no-prazo': {
      label: 'No Prazo',
      className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
      icon: CheckCircle2,
    },
    'entregue-fora-prazo': {
      label: 'Entregue fora do prazo',
      className: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20 dark:text-orange-400',
      icon: AlertCircle,
    },
    atrasado: {
      label: 'Atrasado',
      className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
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
