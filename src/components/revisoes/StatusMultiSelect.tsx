import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { ChevronDown, X } from 'lucide-react';
import type { StatusEntrega, StatusAnalise } from '@/types';

interface StatusMultiSelectProps {
  label: string;
  type: 'entrega' | 'analise';
  selectedValues: (StatusEntrega | StatusAnalise)[];
  onSelectionChange: (values: (StatusEntrega | StatusAnalise)[]) => void;
}

const statusOptions: { value: StatusEntrega | StatusAnalise; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'no-prazo', label: 'No Prazo' },
  { value: 'atrasado', label: 'Atrasado' },
];

export function StatusMultiSelect({
  label,
  type,
  selectedValues,
  onSelectionChange,
}: StatusMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleStatus = (status: StatusEntrega | StatusAnalise) => {
    if (selectedValues.includes(status)) {
      onSelectionChange(selectedValues.filter(s => s !== status));
    } else {
      onSelectionChange([...selectedValues, status]);
    }
  };

  const handleRemoveStatus = (status: StatusEntrega | StatusAnalise) => {
    onSelectionChange(selectedValues.filter(s => s !== status));
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium whitespace-nowrap">{label}:</span>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed"
          >
            <ChevronDown className="h-4 w-4 mr-1" />
            Selecionar
            {selectedValues.length > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {selectedValues.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56" align="start">
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Filtrar por Status</h4>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${type}-${option.value}`}
                    checked={selectedValues.includes(option.value)}
                    onCheckedChange={() => handleToggleStatus(option.value)}
                  />
                  <Label
                    htmlFor={`${type}-${option.value}`}
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    <StatusBadge status={option.value} type={type} />
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Tags dos status selecionados */}
      {selectedValues.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {selectedValues.map((status) => (
            <div
              key={status}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
            >
              <StatusBadge status={status} type={type} />
              <button
                onClick={() => handleRemoveStatus(status)}
                className="ml-1 hover:bg-muted rounded-sm p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
