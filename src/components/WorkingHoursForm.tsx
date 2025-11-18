import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DaySchedule {
  day: string;
  is_open: boolean;
  start_time: string;
  end_time: string;
}

const initialSchedule: DaySchedule[] = [
  { day: 'Segunda', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Terça', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Quarta', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Quinta', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Sexta', is_open: true, start_time: '09:00', end_time: '18:00' },
  { day: 'Sábado', is_open: false, start_time: '09:00', end_time: '13:00' },
  { day: 'Domingo', is_open: false, start_time: '00:00', end_time: '00:00' },
];

interface WorkingHoursFormProps {
  fieldName: string; // Name used in react-hook-form, e.g., 'working_hours'
}

const WorkingHoursForm: React.FC<WorkingHoursFormProps> = ({ fieldName }) => {
  const { watch, setValue } = useFormContext();
  const schedules: DaySchedule[] = watch(fieldName) || initialSchedule;

  React.useEffect(() => {
    // Initialize if not set by defaultValues
    if (!watch(fieldName)) {
      setValue(fieldName, initialSchedule);
    }
  }, [fieldName, setValue, watch]);

  const handleToggleOpen = (index: number, checked: boolean) => {
    const newSchedules = [...schedules];
    newSchedules[index].is_open = checked;
    setValue(fieldName, newSchedules, { shouldDirty: true });
  };

  const handleTimeChange = (index: number, type: 'start_time' | 'end_time', value: string) => {
    const newSchedules = [...schedules];
    newSchedules[index][type] = value;
    setValue(fieldName, newSchedules, { shouldDirty: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horários de Funcionamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedules.map((schedule, index) => (
          <div key={schedule.day} className={cn(
            "flex items-center justify-between p-3 rounded-md transition-colors",
            schedule.is_open ? "bg-gray-50" : "bg-gray-100 opacity-70"
          )}>
            <div className="flex items-center space-x-4 w-1/3">
              <Switch
                id={`switch-${schedule.day}`}
                checked={schedule.is_open}
                onCheckedChange={(checked) => handleToggleOpen(index, checked)}
              />
              <Label htmlFor={`switch-${schedule.day}`} className="font-medium">
                {schedule.day}
              </Label>
            </div>

            <div className="flex space-x-4 w-2/3">
              <div className="flex-1">
                <Label htmlFor={`start-${schedule.day}`} className="text-xs text-muted-foreground">Início</Label>
                <Input
                  id={`start-${schedule.day}`}
                  type="time"
                  value={schedule.start_time}
                  onChange={(e) => handleTimeChange(index, 'start_time', e.target.value)}
                  disabled={!schedule.is_open}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor={`end-${schedule.day}`} className="text-xs text-muted-foreground">Fim</Label>
                <Input
                  id={`end-${schedule.day}`}
                  type="time"
                  value={schedule.end_time}
                  onChange={(e) => handleTimeChange(index, 'end_time', e.target.value)}
                  disabled={!schedule.is_open}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default WorkingHoursForm;