import * as React from "react"
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react"
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, subYears, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// --- MultiSelect Component ---

interface Option {
    label: string
    value: string
}

interface MultiSelectProps {
    title: string
    options: Option[]
    selected: string[]
    onChange: (selected: string[]) => void
    className?: string
}

export function MultiSelect({
    title,
    options,
    selected,
    onChange,
    className,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (value: string) => {
        const newSelected = selected.includes(value)
            ? selected.filter((item) => item !== value)
            : [...selected, value]
        onChange(newSelected)
    }

    const handleClear = () => {
        onChange([])
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("h-9 w-[200px] justify-between border-dashed bg-background", className)}
                >
                    <div className="flex items-center gap-1 truncate">
                        {selected.length > 0 ? (
                            <>
                                <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                    {selected.length}
                                </Badge>
                                <div className="hidden lg:flex gap-1 truncate">
                                    {selected.length > 2 ? (
                                        <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                            {selected.length} selecionados
                                        </Badge>
                                    ) : (
                                        options
                                            .filter((option) => selected.includes(option.value))
                                            .map((option) => (
                                                <Badge
                                                    variant="secondary"
                                                    key={option.value}
                                                    className="rounded-sm px-1 font-normal"
                                                >
                                                    {option.label}
                                                </Badge>
                                            ))
                                    )}
                                </div>
                            </>
                        ) : (
                            <span className="text-muted-foreground">{title}</span>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={title} />
                    <CommandList>
                        <CommandEmpty>Nenhum resultado.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selected.includes(option.value)
                                return (
                                    <CommandItem
                                        key={option.value}
                                        onSelect={() => handleSelect(option.value)}
                                    >
                                        <div
                                            className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}
                                        >
                                            <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <span>{option.label}</span>
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                        {selected.length > 0 && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={handleClear}
                                        className="justify-center text-center"
                                    >
                                        Limpar filtros
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

// --- MonthRangePicker Component ---

const MONTHS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Gerar anos de 2020 a 2030 (ajuste conforme necessidade)
const YEARS = Array.from({ length: 11 }, (_, i) => String(2020 + i));

interface DatePickerWithRangeProps {
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    className?: string
}

export function DatePickerWithRange({ // Mantendo nome para compatibilidade, mas é MonthPicker
    date,
    setDate,
    className,
}: DatePickerWithRangeProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Estados locais para seleção
    const [startMonth, setStartMonth] = React.useState<string>(
        date?.from ? String(date.from.getMonth()) : String(new Date().getMonth())
    );
    const [startYear, setStartYear] = React.useState<string>(
        date?.from ? String(date.from.getFullYear()) : String(new Date().getFullYear())
    );
    const [endMonth, setEndMonth] = React.useState<string>(
        date?.to ? String(date.to.getMonth()) : String(new Date().getMonth())
    );
    const [endYear, setEndYear] = React.useState<string>(
        date?.to ? String(date.to.getFullYear()) : String(new Date().getFullYear())
    );

    const applyFilter = () => {
        const fromDate = new Date(parseInt(startYear), parseInt(startMonth), 1);
        const toDate = endOfMonth(new Date(parseInt(endYear), parseInt(endMonth), 1));

        // Validação básica: se final < inicial, inverte ou ajusta (aqui vamos apenas garantir from <= to)
        if (toDate < fromDate) {
            setDate({ from: toDate, to: endOfMonth(fromDate) });
        } else {
            setDate({ from: fromDate, to: toDate });
        }
        setIsOpen(false);
    };

    const handleShortcut = (type: 'thisYear' | 'lastYear' | 'last12' | 'all') => {
        const now = new Date();
        let from, to;

        if (type === 'thisYear') {
            from = startOfYear(now);
            to = endOfMonth(now); // ou endOfYear para futuro? endOfMonth(now) é melhor para YTD
        } else if (type === 'lastYear') {
            const lastYear = subYears(now, 1);
            from = startOfYear(lastYear);
            to = endOfMonth(lastYear); // 31 Dez
        } else if (type === 'last12') {
            to = endOfMonth(now);
            from = startOfMonth(subMonths(now, 11));
        } else {
            setDate(undefined); // Limpa
            setIsOpen(false);
            return;
        }

        setDate({ from, to });

        // Atualiza estados locais
        setStartMonth(String(from.getMonth()));
        setStartYear(String(from.getFullYear()));
        setEndMonth(String(to.getMonth()));
        setEndYear(String(to.getFullYear()));

        setIsOpen(false);
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "h-9 w-[260px] justify-start text-left font-normal border-dashed bg-background",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "MMM/yyyy", { locale: ptBR })} -{" "}
                                    {format(date.to, "MMM/yyyy", { locale: ptBR })}
                                </>
                            ) : (
                                format(date.from, "MMM/yyyy", { locale: ptBR })
                            )
                        ) : (
                            <span>Selecione o período</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-row gap-4">
                            {/* Atalhos */}
                            <div className="flex flex-col gap-2 border-r pr-4">
                                <Label className="text-xs font-medium text-muted-foreground mb-1">Atalhos</Label>
                                <Button variant="ghost" size="sm" className="justify-start h-8 px-2 w-full text-sm" onClick={() => handleShortcut('thisYear')}>Ano Atual</Button>
                                <Button variant="ghost" size="sm" className="justify-start h-8 px-2 w-full text-sm" onClick={() => handleShortcut('lastYear')}>Ano Anterior</Button>
                                <Button variant="ghost" size="sm" className="justify-start h-8 px-2 w-full text-sm" onClick={() => handleShortcut('last12')}>Últimos 12 meses</Button>
                                <Button variant="ghost" size="sm" className="justify-start h-8 px-2 w-full text-sm" onClick={() => handleShortcut('all')}>Limpar Filtro</Button>
                            </div>

                            {/* Seletores */}
                            <div className="flex flex-col gap-4">
                                <div className="grid gap-2">
                                    <Label className="text-xs">Início</Label>
                                    <div className="flex gap-2">
                                        <Select value={startMonth} onValueChange={setStartMonth}>
                                            <SelectTrigger className="w-[110px] h-8">
                                                <SelectValue placeholder="Mês" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map((m, i) => (
                                                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={startYear} onValueChange={setStartYear}>
                                            <SelectTrigger className="w-[80px] h-8">
                                                <SelectValue placeholder="Ano" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {YEARS.map((y) => (
                                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-xs">Fim</Label>
                                    <div className="flex gap-2">
                                        <Select value={endMonth} onValueChange={setEndMonth}>
                                            <SelectTrigger className="w-[110px] h-8">
                                                <SelectValue placeholder="Mês" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {MONTHS.map((m, i) => (
                                                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={endYear} onValueChange={setEndYear}>
                                            <SelectTrigger className="w-[80px] h-8">
                                                <SelectValue placeholder="Ano" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {YEARS.map((y) => (
                                                    <SelectItem key={y} value={y}>{y}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button className="w-full" onClick={applyFilter}>Aplicar Filtro</Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

// --- ActiveFilters Component ---

interface ActiveFiltersProps {
    filters: {
        empreendimentos: string[]
        projetistas: string[]
        periodo: DateRange | undefined
    }
    options: {
        empreendimentos: Option[]
        projetistas: Option[]
    }
    onRemove: (type: 'empreendimentos' | 'projetistas' | 'periodo', value?: string) => void
    onClearAll: () => void
}

export function ActiveFilters({ filters, options, onRemove, onClearAll }: ActiveFiltersProps) {
    const hasFilters =
        filters.empreendimentos.length > 0 ||
        filters.projetistas.length > 0 ||
        filters.periodo?.from !== undefined

    if (!hasFilters) return null

    return (
        <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">Filtros ativos:</span>

            {filters.empreendimentos.map((id) => {
                const label = options.empreendimentos.find(o => o.value === id)?.label || id
                return (
                    <Badge key={id} variant="secondary" className="rounded-sm h-7 px-2 flex items-center gap-1 bg-white border shadow-sm">
                        <span className="text-muted-foreground">Emp:</span> {label}
                        <button
                            onClick={() => onRemove('empreendimentos', id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remover</span>
                        </button>
                    </Badge>
                )
            })}

            {filters.projetistas.map((id) => {
                const label = options.projetistas.find(o => o.value === id)?.label || id
                return (
                    <Badge key={id} variant="secondary" className="rounded-sm h-7 px-2 flex items-center gap-1 bg-white border shadow-sm">
                        <span className="text-muted-foreground">Proj:</span> {label}
                        <button
                            onClick={() => onRemove('projetistas', id)}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remover</span>
                        </button>
                    </Badge>
                )
            })}

            {filters.periodo?.from && (
                <Badge variant="secondary" className="rounded-sm h-7 px-2 flex items-center gap-1 bg-white border shadow-sm">
                    <span className="text-muted-foreground">Período:</span>
                    {format(filters.periodo.from, "MMM/yyyy", { locale: ptBR })}
                    {filters.periodo.to ? ` → ${format(filters.periodo.to, "MMM/yyyy", { locale: ptBR })}` : ''}
                    <button
                        onClick={() => onRemove('periodo')}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remover</span>
                    </button>
                </Badge>
            )}

            <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-muted-foreground hover:text-foreground ml-auto sm:ml-0"
                onClick={onClearAll}
            >
                Limpar tudo
                <X className="ml-2 h-3 w-3" />
            </Button>
        </div>
    )
}
