
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface TimeMachineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTimestamp: string;
}

export const TimeMachineDialog: React.FC<TimeMachineDialogProps> = ({
  open,
  onOpenChange,
  initialTimestamp
}) => {
  const initialDate = new Date(initialTimestamp);
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [selectedTime, setSelectedTime] = useState<string>(
    format(initialDate, 'HH:mm')
  );
  const isMobile = useIsMobile();

  const handleSetTime = () => {
    // Placeholder for future functionality
    console.log('Time Machine activated:', {
      date: selectedDate,
      time: selectedTime,
      combinedDateTime: new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`)
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to initial values
    setSelectedDate(initialDate);
    setSelectedTime(format(initialDate, 'HH:mm'));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "w-[calc(100vw-1rem)] max-w-2xl mx-auto",
        "max-h-[95vh] overflow-y-auto",
        "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
        isMobile ? "px-3 py-4" : "px-6 py-6"
      )}>
        <DialogHeader className={isMobile ? "pb-3" : "pb-4"}>
          <DialogTitle className={cn(
            "flex items-center gap-2 text-center justify-center",
            isMobile ? "text-lg" : "text-xl"
          )}>
            <Clock className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
            Time Machine
          </DialogTitle>
        </DialogHeader>
        
        <div className={cn("space-y-4", isMobile ? "space-y-3" : "space-y-4")}>
          {/* Date Selection - Larger Calendar */}
          <div className="space-y-2">
            <Label htmlFor="date-picker" className={cn(
              "text-sm font-medium block text-center",
              isMobile ? "text-base" : "text-sm"
            )}>
              Select Date
            </Label>
            <div className="flex justify-center w-full">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className={cn(
                  "pointer-events-auto border rounded-lg bg-card mx-auto",
                  isMobile 
                    ? "p-1 w-full max-w-sm [&_.rdp-day]:h-10 [&_.rdp-day]:w-10 [&_.rdp-day]:text-base [&_.rdp-head_cell]:h-8 [&_.rdp-head_cell]:text-sm [&_.rdp-caption]:text-base [&_.rdp-nav_button]:h-8 [&_.rdp-nav_button]:w-8" 
                    : "p-2 [&_.rdp-day]:h-12 [&_.rdp-day]:w-12 [&_.rdp-day]:text-lg [&_.rdp-head_cell]:h-10 [&_.rdp-head_cell]:text-base [&_.rdp-caption]:text-lg [&_.rdp-nav_button]:h-10 [&_.rdp-nav_button]:w-10"
                )}
                disabled={(date) => date > new Date()}
              />
            </div>
          </div>
          
          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time-picker" className={cn(
              "text-sm font-medium block text-center",
              isMobile ? "text-base" : "text-sm"
            )}>
              Select Time
            </Label>
            <div className="flex justify-center">
              <Input
                id="time-picker"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className={cn(
                  "text-center max-w-xs",
                  isMobile 
                    ? "h-12 text-lg w-48" 
                    : "h-11 text-base w-40"
                )}
              />
            </div>
          </div>
          
          {/* Original Time Display */}
          <div className={cn(
            "text-center p-3 bg-muted/50 rounded-lg border mx-auto max-w-md",
            isMobile ? "text-sm p-2" : "text-xs p-3"
          )}>
            <span className="text-muted-foreground font-medium">
              Original message time:
            </span>
            <br />
            <span className="font-mono">
              {format(initialDate, isMobile ? 'MMM d, yyyy • h:mm a' : 'PPP p')}
            </span>
          </div>
        </div>

        <DialogFooter className={cn(
          "flex gap-3 pt-4",
          isMobile 
            ? "flex-col-reverse space-y-reverse space-y-3" 
            : "flex-row justify-center space-x-4"
        )}>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className={cn(
              isMobile 
                ? "w-full h-12 text-base" 
                : "min-w-[100px] h-10"
            )}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSetTime}
            className={cn(
              isMobile 
                ? "w-full h-12 text-base bg-[#dd3333] hover:bg-[#cc2222] border-[#dd3333]" 
                : "min-w-[100px] h-10 bg-[#dd3333] hover:bg-[#cc2222] border-[#dd3333]"
            )}
          >
            Set Time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
