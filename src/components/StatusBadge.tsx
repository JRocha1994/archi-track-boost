import { Badge } from '@/components/ui/badge';
import type { StatusEntrega, StatusAnalise } from '@/types';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: StatusEntrega | StatusAnalise;
  type: 'entrega' | 'analise';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const config: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
    'pendente': {
      label: 'Pendente',
      className: 'bg-muted text-muted-foreground border-border',
      icon: Clock,
    },
    'no-prazo': {
      label: 'No prazo',
      className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
      icon: CheckCircle2,
    },
    'entregue-depois-do-prazo': {
      label: 'Entregue depois do prazo',
      className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
      icon: AlertCircle,
    },
    'atrasado': {
      label: 'Atrasado',
      className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
      icon: AlertCircle,
    },
    'sem-projeto': {
      label: 'Sem projeto',
      className: 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200',
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
