
import * as React from "react"
import { Input } from "@/components/ui/input"
import { CountryCodeSelect } from "@/components/ui/country-code-select"
import { cn } from "@/lib/utils"

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  countryCode: string;
  onChange: (value: string) => void;
  onCountryCodeChange: (code: string) => void;
}

export function PhoneInput({
  className,
  value,
  countryCode,
  onChange,
  onCountryCodeChange,
  disabled,
  ...props
}: PhoneInputProps) {
  // Format phone number as user types (US format: XXX-XXX-XXXX)
  const formatPhoneNumber = (input: string): string => {
    // Strip all non-numeric characters
    const numbers = input.replace(/\D/g, '');
    
    // Apply formatting based on length
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    onChange(formatted);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-shrink-0">
        <CountryCodeSelect 
          value={countryCode} 
          onValueChange={onCountryCodeChange} 
        />
      </div>
      <Input
        type="tel"
        className={cn("flex-grow", className)}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder="XXX-XXX-XXXX"
        {...props}
      />
    </div>
  )
}
