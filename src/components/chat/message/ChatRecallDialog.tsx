
import React, { useState } from 'react';
import { format } from 'date-fns';
import { History, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
    console.log('Chat Recall activated:', {
      date: selectedDate,
      time: selectedTime,
      combinedDateTime: new Date(`${format(selectedDate, 'yyyy-MM-dd')}T${selectedTime}`)
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    setSelectedDate(initialDate);
    setSelectedTime(format(initialDate, 'HH:mm'));
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Light overlay - no heavy dimming */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/10" />
        
        {/* Dialog content - positioned higher on screen */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] z-50 translate-x-[-50%]",
            "bg-background/90 backdrop-blur-md border border-border/50 shadow-2xl",
            "w-[calc(100vw-2rem)] max-w-[320px]",
            "overflow-hidden",
            isMobile 
              ? "top-[50%] translate-y-[-50%] rounded-2xl px-4 py-5" 
              : "top-[40%] translate-y-[-50%] rounded-xl px-5 py-5"
          )}
        >
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          {/* Header */}
          <div className="text-center pb-3">
            <DialogPrimitive.Title className={cn(
              "flex items-center gap-2 justify-center font-semibold",
              isMobile ? "text-lg" : "text-lg"
            )}>
              <History className="h-5 w-5 text-primary" />
              Chat Recall
            </DialogPrimitive.Title>
          </div>
          
          <div className="space-y-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-center block text-muted-foreground">
                Select Date
              </Label>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className={cn(
                  "pointer-events-auto rounded-lg mx-auto",
                  "[&_.rdp-day_selected]:bg-primary [&_.rdp-day_selected]:text-primary-foreground",
                  "[&_.rdp-day_today]:bg-accent [&_.rdp-day_today]:text-accent-foreground",
                  "[&_.rdp-day]:hover:bg-muted",
                  "[&_.rdp-nav_button]:hover:bg-muted",
                  "[&_.rdp-months]:justify-center",
                  "[&_.rdp-month]:mx-auto",
                  "[&_.rdp-table]:mx-auto"
                )}
                disabled={(date) => date > new Date()}
                showOutsideDays={true}
                fixedWeeks={true}
              />
            </div>
            
            {/* Time Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-center block text-muted-foreground">
                Select Time
              </Label>
              <div className="flex justify-center">
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className={cn(
                    "text-center font-mono bg-muted/50 border-border/50",
                    "h-10 text-base w-32"
                  )}
                />
              </div>
            </div>
            
            {/* Original Time Display */}
            <div className="text-center py-1.5 px-3 bg-muted/30 rounded-lg border border-border/30 mx-auto max-w-[260px]">
              <span className="text-xs text-muted-foreground">
                Original: {format(initialDate, 'MMM d, yyyy • h:mm a')}
              </span>
            </div>
          </div>

          {/* Footer buttons */}
          <div className={cn(
            "pt-4 gap-2 flex",
            isMobile ? "flex-col" : "flex-row justify-center"
          )}>
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className={cn(
                "border-border/50",
                isMobile ? "w-full h-10" : "min-w-[80px]"
              )}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRecall}
              className={cn(
                "bg-primary hover:bg-primary/90",
                isMobile ? "w-full h-10" : "min-w-[80px]"
              )}
            >
              Recall
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
