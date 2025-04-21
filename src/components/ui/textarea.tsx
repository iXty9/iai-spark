
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[40px] max-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden scrollbar-none",
          className
        )}
        ref={ref}
        {...props}
        style={{
          ...props.style,
          scrollbarWidth: 'none',  // Firefox
          msOverflowStyle: 'none',  // IE/Edge
        }}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
