
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
        "w-[calc(100vw-2rem)] max-w-lg mx-auto",
        "max-h-[90vh] overflow-y-auto",
        isMobile ? "px-4 py-6" : "sm:max-w-lg"
      )}>
        <DialogHeader className={isMobile ? "pb-4" : ""}>
          <DialogTitle className={cn(
            "flex items-center gap-2 text-center justify-center",
            isMobile ? "text-lg" : "text-xl"
          )}>
            <Clock className={isMobile ? "h-5 w-5" : "h-6 w-6"} />
            Time Machine
          </DialogTitle>
        </DialogHeader>
        
        <div className={cn("space-y-6", isMobile ? "space-y-4" : "space-y-6")}>
          {/* Date Selection */}
          <div className="space-y-3">
            <Label htmlFor="date-picker" className={cn(
              "text-sm font-medium",
              isMobile ? "text-base" : "text-sm"
            )}>
              Select Date
            </Label>
            <div className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className={cn(
                  "pointer-events-auto border rounded-lg bg-card",
                  isMobile 
                    ? "p-2 scale-90 origin-center" 
                    : "p-3"
                )}
                disabled={(date) => date > new Date()}
              />
            </div>
          </div>
          
          {/* Time Selection */}
          <div className="space-y-3">
            <Label htmlFor="time-picker" className={cn(
              "text-sm font-medium",
              isMobile ? "text-base" : "text-sm"
            )}>
              Select Time
            </Label>
            <Input
              id="time-picker"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className={cn(
                "w-full text-center",
                isMobile 
                  ? "h-12 text-lg" 
                  : "h-10 text-base"
              )}
            />
          </div>
          
          {/* Original Time Display */}
          <div className={cn(
            "text-center p-3 bg-muted/50 rounded-lg border",
            isMobile ? "text-sm" : "text-xs"
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
          "flex gap-3 pt-6",
          isMobile 
            ? "flex-col-reverse space-y-reverse space-y-3" 
            : "flex-row justify-end space-x-2"
        )}>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className={cn(
              isMobile 
                ? "w-full h-12 text-base" 
                : "min-w-[80px]"
            )}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSetTime}
            className={cn(
              isMobile 
                ? "w-full h-12 text-base bg-[#dd3333] hover:bg-[#cc2222] border-[#dd3333]" 
                : "min-w-[80px] bg-[#dd3333] hover:bg-[#cc2222] border-[#dd3333]"
            )}
          >
            Set Time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
