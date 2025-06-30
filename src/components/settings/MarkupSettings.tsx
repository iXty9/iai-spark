
import React from 'react';
import { ThemeColors } from '@/types/theme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw, Code, Link, Quote, Table } from 'lucide-react';

interface MarkupSettingsProps {
  colors: ThemeColors;
  onColorChange: (colorKey: string, value: string | number) => void;
  onReset: () => void;
}

export const MarkupSettings: React.FC<MarkupSettingsProps> = ({
  colors,
  onColorChange,
  onReset
}) => {
  const handleChange = (colorKey: string, value: string) => {
    onColorChange(colorKey, value);
  };

  const markupElements = [
    {
      key: 'codeBlockBackground',
      textKey: 'codeBlockTextColor',
      label: 'Code Block',
      backgroundValue: colors.codeBlockBackground || '#f3f4f6',
      textValue: colors.codeBlockTextColor || '#1f2937',
      icon: Code,
      description: 'Background and text colors for code blocks and inline code'
    },
    {
      key: 'linkColor',
      textKey: 'linkTextColor',
      label: 'Links',
      backgroundValue: colors.linkColor || '#2563eb',
      textValue: colors.linkTextColor || '#2563eb',
      icon: Link,
      description: 'Color for clickable links in messages'
    },
    {
      key: 'blockquoteColor',
      textKey: 'blockquoteTextColor',
      label: 'Blockquote',
      backgroundValue: colors.blockquoteColor || '#d1d5db',
      textValue: colors.blockquoteTextColor || '#4b5563',
      icon: Quote,
      description: 'Border and text colors for quoted text blocks'
    },
    {
      key: 'tableHeaderBackground',
      textKey: 'tableHeaderTextColor',
      label: 'Table Header',
      backgroundValue: colors.tableHeaderBackground || '#f9fafb',
      textValue: colors.tableHeaderTextColor || '#111827',
      icon: Table,
      description: 'Background and text colors for table headers'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Markup Styling</h3>
          <p className="text-sm text-muted-foreground">
            Customize colors for markdown elements in AI messages
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="flex items-center space-x-2"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {markupElements.map((element) => (
          <Card key={element.key} className="p-4">
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
                    <Label htmlFor={`${element.key}-bg`} className="text-xs text-muted-foreground">
                      Background Color
                    </Label>
                    <input
                      id={`${element.key}-bg`}
                      type="color"
                      value={element.backgroundValue}
                      onChange={(e) => handleChange(element.key, e.target.value)}
                      className="w-full h-8 rounded border cursor-pointer"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`${element.textKey}-text`} className="text-xs text-muted-foreground">
                      Text Color
                    </Label>
                    <input
                      id={`${element.textKey}-text`}
                      type="color"
                      value={element.textValue}
                      onChange={(e) => handleChange(element.textKey, e.target.value)}
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
        ))}
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Code className="h-4 w-4" />
          Preview
        </h4>
        <div className="space-y-3 text-sm">
          <p>Here's how your markup elements will look:</p>
          
          <div 
            className="inline-block px-2 py-1 rounded text-xs font-mono border"
            style={{ 
              backgroundColor: colors.codeBlockBackground || '#f3f4f6',
              color: colors.codeBlockTextColor || '#1f2937'
            }}
          >
            code block
          </div>
          
          <div>
            <span 
              className="underline"
              style={{ color: colors.linkTextColor || colors.linkColor || '#2563eb' }}
            >
              example link
            </span>
          </div>
          
          <div 
            className="border-l-4 pl-2 italic text-xs"
            style={{ 
              borderLeftColor: colors.blockquoteColor || '#d1d5db',
              color: colors.blockquoteTextColor || '#4b5563'
            }}
          >
            blockquote text
          </div>
          
          <div 
            className="inline-block px-2 py-1 text-xs font-semibold rounded"
            style={{ 
              backgroundColor: colors.tableHeaderBackground || '#f9fafb',
              color: colors.tableHeaderTextColor || '#111827'
            }}
          >
            table header
          </div>
        </div>
      </div>
    </div>
  );
};
