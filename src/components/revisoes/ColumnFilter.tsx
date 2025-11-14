import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter, X } from 'lucide-react';

interface ColumnFilterProps {
  column: string;
  values: string[];
  selectedValues: string[];
  onFilterChange: (values: string[]) => void;
  type?: 'text' | 'date';
  dateRange?: { start?: string; end?: string };
  onDateRangeChange?: (range: { start?: string; end?: string }) => void;
}

export function ColumnFilter({
  column,
  values,
  selectedValues,
  onFilterChange,
  type = 'text',
  dateRange,
  onDateRangeChange,
}: ColumnFilterProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredValues = values.filter(v => 
    v.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    onFilterChange(values);
  };

  const handleClearAll = () => {
    onFilterChange([]);
  };

  const handleToggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onFilterChange(selectedValues.filter(v => v !== value));
    } else {
      onFilterChange([...selectedValues, value]);
    }
  };

  const isFiltered = type === 'text' 
    ? selectedValues.length > 0 && selectedValues.length < values.length
    : dateRange?.start || dateRange?.end;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${isFiltered ? 'text-primary' : ''}`}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Filtrar {column}</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {type === 'date' ? (
            <div className="space-y-2">
              <div>
                <Label htmlFor="dateStart" className="text-xs">Data Inicial</Label>
                <Input
                  id="dateStart"
                  type="date"
                  value={dateRange?.start || ''}
                  onChange={(e) => onDateRangeChange?.({ ...dateRange, start: e.target.value })}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="dateEnd" className="text-xs">Data Final</Label>
                <Input
                  id="dateEnd"
                  type="date"
                  value={dateRange?.end || ''}
                  onChange={(e) => onDateRangeChange?.({ ...dateRange, end: e.target.value })}
                  className="h-8"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onDateRangeChange?.({ start: undefined, end: undefined })}
              >
                Limpar Datas
              </Button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleSelectAll}
                >
                  Selecionar Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleClearAll}
                >
                  Limpar
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredValues.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum valor encontrado
                  </p>
                ) : (
                  filteredValues.map((value) => (
                    <div key={value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`filter-${column}-${value}`}
                        checked={selectedValues.includes(value)}
                        onCheckedChange={() => handleToggleValue(value)}
                      />
                      <Label
                        htmlFor={`filter-${column}-${value}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {value}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
