
import React, { useState } from 'react';
import { format } from 'date-fns';
import { History, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/10" />
        
        {/* Dialog content - positioned higher on screen */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[40%] z-[60] -translate-x-1/2 -translate-y-1/2",
            "bg-background/90 backdrop-blur-md border border-border/50 shadow-2xl",
            "w-[calc(100vw-2rem)] max-w-[320px] md:max-w-[380px] lg:max-w-[420px]",
            "overflow-hidden rounded-2xl px-4 py-5 md:rounded-xl md:px-5 md:py-6"
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
            <DialogPrimitive.Title className="flex items-center gap-2 justify-center font-semibold text-lg">
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
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="pointer-events-auto rounded-lg"
                  disabled={(date) => date > new Date()}
                  showOutsideDays={true}
                  fixedWeeks={true}
                />
              </div>
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
          <div className="pt-4 gap-2 flex flex-col md:flex-row md:justify-center">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="border-border/50 w-full md:w-auto md:min-w-[100px]"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRecall}
              className="bg-primary hover:bg-primary/90 w-full md:w-auto md:min-w-[100px]"
            >
              Recall
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
