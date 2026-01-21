import * as React from "react"
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
                    className={cn("h-8 w-[200px] justify-between border-dashed", className)}
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
                            title
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

// --- DateRangePicker Component ---

interface DatePickerWithRangeProps {
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    className?: string
}

export function DatePickerWithRange({
    date,
    setDate,
    className,
}: DatePickerWithRangeProps) {
    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "h-8 w-[240px] justify-start text-left font-normal border-dashed",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd/MM/y", { locale: ptBR })} -{" "}
                                    {format(date.to, "dd/MM/y", { locale: ptBR })}
                                </>
                            ) : (
                                format(date.from, "dd/MM/y", { locale: ptBR })
                            )
                        ) : (
                            <span>Selecione o período</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        locale={ptBR}
                    />
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
            <span className="text-sm font-medium text-muted-foreground">Filtros ativos:</span>

            {filters.empreendimentos.map((id) => {
                const label = options.empreendimentos.find(o => o.value === id)?.label || id
                return (
                    <Badge key={id} variant="secondary" className="rounded-sm h-7 px-2 flex items-center gap-1">
                        Emp: {label}
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
                    <Badge key={id} variant="secondary" className="rounded-sm h-7 px-2 flex items-center gap-1">
                        Proj: {label}
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
                <Badge variant="secondary" className="rounded-sm h-7 px-2 flex items-center gap-1">
                    Período: {format(filters.periodo.from, "dd/MM/yy", { locale: ptBR })}
                    {filters.periodo.to ? ` - ${format(filters.periodo.to, "dd/MM/yy", { locale: ptBR })}` : ''}
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
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
                onClick={onClearAll}
            >
                Limpar tudo
                <X className="ml-2 h-3 w-3" />
            </Button>
        </div>
    )
}
