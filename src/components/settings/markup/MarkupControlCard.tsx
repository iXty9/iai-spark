
import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MarkupElement } from './MarkupElementConfig';

interface MarkupControlCardProps {
  element: MarkupElement;
  mode: 'light' | 'dark';
  onBackgroundChange: (key: string, value: string) => void;
  onTextChange: (key: string, value: string) => void;
}

export const MarkupControlCard: React.FC<MarkupControlCardProps> = ({
  element,
  mode,
  onBackgroundChange,
  onTextChange
}) => {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
          <element.icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-medium">
              {element.label}
            </Label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${element.key}-bg-${mode}`} className="text-xs text-muted-foreground">
                {element.key === 'linkColor' ? 'Hover Background Color' : 'Background Color'}
              </Label>
              <input
                id={`${element.key}-bg-${mode}`}
                type="color"
                value={element.backgroundValue}
                onChange={(e) => onBackgroundChange(element.key, e.target.value)}
                className="w-full h-8 rounded border cursor-pointer"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`${element.textKey}-text-${mode}`} className="text-xs text-muted-foreground">
                {element.key === 'linkColor' ? 'Link Text Color' : 'Text Color'}
              </Label>
              <input
                id={`${element.textKey}-text-${mode}`}
                type="color"
                value={element.textValue}
                onChange={(e) => onTextChange(element.textKey, e.target.value)}
                className="w-full h-8 rounded border cursor-pointer"
              />
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {element.description}
          </p>
        </div>
      </div>
    </Card>
  );
};
