
import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
 
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "./scroll-area"

export type CountryCode = {
  code: string;
  dialCode: string;
  name: string;
}

const countryCodes: CountryCode[] = [
  { code: "US", dialCode: "+1", name: "United States" },
  { code: "CA", dialCode: "+1", name: "Canada" },
  { code: "GB", dialCode: "+44", name: "United Kingdom" },
  { code: "AU", dialCode: "+61", name: "Australia" },
  { code: "DE", dialCode: "+49", name: "Germany" },
  { code: "FR", dialCode: "+33", name: "France" },
  { code: "JP", dialCode: "+81", name: "Japan" },
  { code: "CN", dialCode: "+86", name: "China" },
  { code: "IN", dialCode: "+91", name: "India" },
  { code: "BR", dialCode: "+55", name: "Brazil" },
  { code: "MX", dialCode: "+52", name: "Mexico" },
  { code: "IT", dialCode: "+39", name: "Italy" },
  { code: "ES", dialCode: "+34", name: "Spain" },
  { code: "KR", dialCode: "+82", name: "South Korea" },
  { code: "NL", dialCode: "+31", name: "Netherlands" },
  { code: "SE", dialCode: "+46", name: "Sweden" },
  { code: "NO", dialCode: "+47", name: "Norway" },
  { code: "DK", dialCode: "+45", name: "Denmark" },
  { code: "FI", dialCode: "+358", name: "Finland" },
  { code: "CH", dialCode: "+41", name: "Switzerland" },
  { code: "NZ", dialCode: "+64", name: "New Zealand" },
  { code: "SG", dialCode: "+65", name: "Singapore" },
  { code: "AE", dialCode: "+971", name: "United Arab Emirates" },
  { code: "SA", dialCode: "+966", name: "Saudi Arabia" },
  { code: "ZA", dialCode: "+27", name: "South Africa" },
  // Add more as needed
];

export interface CountryCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function CountryCodeSelect({
  value,
  onValueChange,
}: CountryCodeSelectProps) {
  const [open, setOpen] = React.useState(false)
  
  // Find the current country from the dial code
  const currentCountry = React.useMemo(() => {
    return countryCodes.find(country => country.dialCode === value) || countryCodes[0];
  }, [value]);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[120px] justify-between"
        >
          <span>{currentCountry.dialCode} {currentCountry.code}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-[200px]">
              {countryCodes.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.dialCode}`}
                  onSelect={() => {
                    onValueChange(country.dialCode);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.dialCode ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {country.dialCode} {country.name} ({country.code})
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
