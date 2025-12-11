
import React, { useState } from 'react';
import { format } from 'date-fns';
import { History, X } from 'lucide-react';
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

interface ChatRecallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTimestamp: string;
}

export const ChatRecallDialog: React.FC<ChatRecallDialogProps> = ({
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

  const handleRecall = () => {
    // Placeholder for future functionality
    console.log('Chat Recall activated:', {
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
        "bg-background/80 backdrop-blur-md border border-border/50 shadow-2xl",
        "w-[calc(100vw-2rem)] max-w-md",
        "max-h-[calc(100vh-4rem)] overflow-y-auto",
        isMobile ? "px-4 py-5 rounded-2xl" : "px-6 py-6 rounded-xl"
      )}>
        {/* Custom close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <DialogHeader className="pb-4">
          <DialogTitle className={cn(
            "flex items-center gap-2 justify-center",
            isMobile ? "text-lg" : "text-xl"
          )}>
            <History className={cn(
              "text-primary",
              isMobile ? "h-5 w-5" : "h-5 w-5"
            )} />
            Chat Recall
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-5">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-center block text-muted-foreground">
              Select Date
            </Label>
            <div className="flex justify-center">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className={cn(
                  "pointer-events-auto rounded-lg",
                  "w-full",
                  "[&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground",
                  "[&_.rdp-day_today]:bg-accent [&_.rdp-day_today]:text-accent-foreground",
                  "[&_.rdp-day]:hover:bg-muted",
                  "[&_.rdp-nav_button]:hover:bg-muted",
                  isMobile 
                    ? "[&_.rdp-day]:h-10 [&_.rdp-day]:w-10 [&_.rdp-head_cell]:text-sm" 
                    : "[&_.rdp-day]:h-9 [&_.rdp-day]:w-9"
                )}
                disabled={(date) => date > new Date()}
                showOutsideDays={true}
              />
            </div>
          </div>
          
          {/* Time Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-center block text-muted-foreground">
              Select Time
            </Label>
            <div className="flex justify-center">
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className={cn(
                  "text-center font-mono bg-muted/50 border-border/50",
                  isMobile 
                    ? "h-12 text-lg w-40" 
                    : "h-10 text-base w-36"
                )}
              />
            </div>
          </div>
          
          {/* Original Time Display */}
          <div className="text-center py-2 px-3 bg-muted/30 rounded-lg border border-border/30 mx-auto max-w-xs">
            <span className="text-xs text-muted-foreground">
              Original: {format(initialDate, isMobile ? 'MMM d, yyyy • h:mm a' : 'PPP p')}
            </span>
          </div>
        </div>

        <DialogFooter className={cn(
          "pt-5 gap-3",
          isMobile ? "flex-col" : "flex-row justify-center"
        )}>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className={cn(
              "border-border/50",
              isMobile ? "w-full h-11" : "min-w-[90px]"
            )}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRecall}
            className={cn(
              "bg-primary hover:bg-primary/90",
              isMobile ? "w-full h-11" : "min-w-[90px]"
            )}
          >
            Recall
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
