
import React from 'react';
import { ThemeColors } from '@/types/theme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RotateCcw, Code, Link, Quote, Table } from 'lucide-react';

interface MarkupSettingsProps {
  colors: ThemeColors;
  onColorChange: (colorKey: string, value: string | number) => void; // FIXED: Correct signature
  onReset: () => void;
}

export const MarkupSettings: React.FC<MarkupSettingsProps> = ({
  colors,
  onColorChange,
  onReset
}) => {
  const handleChange = (colorKey: string, value: string) => {
    onColorChange(colorKey, value); // FIXED: Call with correct signature
  };

  const markupElements = [
    {
      key: 'codeBlockBackground',
      label: 'Code Block Background',
      value: colors.codeBlockBackground || '#f3f4f6',
      icon: Code,
      description: 'Background color for code blocks and inline code'
    },
    {
      key: 'linkColor',
      label: 'Link Color',
      value: colors.linkColor || '#2563eb',
      icon: Link,
      description: 'Color for clickable links in messages'
    },
    {
      key: 'blockquoteColor',
      label: 'Blockquote Border',
      value: colors.blockquoteColor || '#d1d5db',
      icon: Quote,
      description: 'Border color for quoted text blocks'
    },
    {
      key: 'tableHeaderBackground',
      label: 'Table Header Background',
      value: colors.tableHeaderBackground || '#f9fafb',
      icon: Table,
      description: 'Background color for table headers'
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
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={element.key} className="font-medium">
                    {element.label}
                  </Label>
                  <input
                    id={element.key}
                    type="color"
                    value={element.value}
                    onChange={(e) => handleChange(element.key, e.target.value)}
                    className="w-12 h-8 rounded border cursor-pointer"
                  />
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
        <div className="space-y-2 text-sm">
          <p>Here's how your markup elements will look:</p>
          <div 
            className="inline-block px-2 py-1 rounded text-xs font-mono border"
            style={{ backgroundColor: colors.codeBlockBackground || '#f3f4f6' }}
          >
            code block
          </div>
          <div>
            <span 
              className="underline"
              style={{ color: colors.linkColor || '#2563eb' }}
            >
              example link
            </span>
          </div>
          <div 
            className="border-l-4 pl-2 italic text-xs"
            style={{ borderLeftColor: colors.blockquoteColor || '#d1d5db' }}
          >
            blockquote text
          </div>
          <div 
            className="inline-block px-2 py-1 text-xs font-semibold rounded"
            style={{ backgroundColor: colors.tableHeaderBackground || '#f9fafb' }}
          >
            table header
          </div>
        </div>
      </div>
    </div>
  );
};
