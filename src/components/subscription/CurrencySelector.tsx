import { useState } from "react"
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
import { currencySymbols } from "@/utils/currency"

// Map of currency codes to full names
const currencyNames: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  JPY: "Japanese Yen",
  CNY: "Chinese Yuan",
  INR: "Indian Rupee",
  BRL: "Brazilian Real",
  MXN: "Mexican Peso",
  RUB: "Russian Ruble",
  KRW: "South Korean Won",
  ZAR: "South African Rand",
  NZD: "New Zealand Dollar",
  CHF: "Swiss Franc",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar"
}

// Convert the currency symbols and names to an array for the selector
const currencies = Object.entries(currencySymbols).map(([code, symbol]) => ({
  value: code,
  label: `${code} - ${currencyNames[code] || code}`,
  symbol
}))

interface CurrencySelectorProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function CurrencySelector({ 
  value, 
  onValueChange, 
  className 
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false)
  
  // Find the selected currency
  const selectedCurrency = currencies.find(
    (currency) => currency.value === value
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedCurrency ? (
            <span className="flex items-center gap-2">
              <span className="text-sm">{selectedCurrency.symbol}</span>
              <span>{selectedCurrency.value}</span>
            </span>
          ) : (
            "Select currency"
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {currencies.map((currency) => (
              <CommandItem
                key={currency.value}
                value={currency.value}
                onSelect={(currentValue) => {
                  onValueChange(currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === currency.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="mr-2 text-sm">{currency.symbol}</span>
                <span>{currency.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}