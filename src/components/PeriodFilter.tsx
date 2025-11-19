import * as React from "react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DateRange {
  from: Date;
  to: Date;
}

interface PeriodFilterProps {
  range: DateRange;
  setRange: (range: DateRange) => void;
}

const getRangeLabel = (range: DateRange) => {
  const today = startOfDay(new Date());
  const yesterday = startOfDay(subDays(today, 1));
  const last7DaysStart = startOfDay(subDays(today, 6));
  const last30DaysStart = startOfDay(subDays(today, 29));
  const currentMonthStart = startOfMonth(today);

  if (isSameDay(range.from, today) && isSameDay(range.to, endOfDay(today))) return "Hoje";
  if (isSameDay(range.from, yesterday) && isSameDay(range.to, endOfDay(yesterday))) return "Ontem";
  if (isSameDay(range.from, last7DaysStart) && isSameDay(range.to, endOfDay(today))) return "Últimos 7 dias";
  if (isSameDay(range.from, last30DaysStart) && isSameDay(range.to, endOfDay(today))) return "Últimos 30 dias";
  if (isSameDay(range.from, currentMonthStart) && isSameDay(range.to, endOfDay(endOfMonth(today)))) return "Mês Atual";
  
  return `${format(range.from, 'dd/MM/yy')} - ${format(range.to, 'dd/MM/yy')}`;
};

export function PeriodFilter({ range, setRange }: PeriodFilterProps) {
  const handleQuickSelect = (value: string) => {
    const today = new Date();
    let newRange: DateRange;

    switch (value) {
      case 'today':
        newRange = { from: startOfDay(today), to: endOfDay(today) };
        break;
      case 'yesterday':
        const yesterday = subDays(today, 1);
        newRange = { from: startOfDay(yesterday), to: endOfDay(yesterday) };
        break;
      case 'last7':
        newRange = { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
        break;
      case 'last30':
        newRange = { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
        break;
      case 'month':
        newRange = { from: startOfMonth(today), to: endOfDay(endOfMonth(today)) };
        break;
      default:
        return;
    }
    setRange(newRange);
  };

  const handleDateSelect = (date: Date | undefined, type: 'from' | 'to') => {
    if (!date) return;
    
    let newRange = { ...range };
    
    if (type === 'from') {
        newRange.from = startOfDay(date);
        // Ensure 'from' is not after 'to'
        if (isAfter(newRange.from, newRange.to)) {
            newRange.to = endOfDay(date);
        }
    } else {
        newRange.to = endOfDay(date);
        // Ensure 'to' is not before 'from'
        if (isBefore(newRange.to, newRange.from)) {
            newRange.from = startOfDay(date);
        }
    }
    setRange(newRange);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      {/* Quick Select */}
      <Select onValueChange={handleQuickSelect} defaultValue="month">
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Período Rápido" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="yesterday">Ontem</SelectItem>
          <SelectItem value="last7">Últimos 7 dias</SelectItem>
          <SelectItem value="last30">Últimos 30 dias</SelectItem>
          <SelectItem value="month">Mês Atual</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full sm:w-[300px] justify-start text-left font-normal",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getRangeLabel(range)}
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col p-4 space-y-4">
            <div className="flex space-x-2">
                <div className="space-y-1">
                    <p className="text-sm font-medium">De:</p>
                    <Calendar
                        mode="single"
                        selected={range.from}
                        onSelect={(date) => handleDateSelect(date, 'from')}
                        initialFocus
                        locale={ptBR}
                    />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium">Até:</p>
                    <Calendar
                        mode="single"
                        selected={range.to}
                        onSelect={(date) => handleDateSelect(date, 'to')}
                        initialFocus
                        locale={ptBR}
                        disabled={(date) => isBefore(date, range.from)}
                    />
                </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}