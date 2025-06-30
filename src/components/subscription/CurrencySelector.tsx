import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { currencySymbols } from "@/utils/currency"
import { useSettingsStore } from "@/store/settingsStore"

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
  const { exchangeRates, fetchExchangeRates } = useSettingsStore()

  // Fetch exchange rates on component mount
  useEffect(() => {
    fetchExchangeRates()
  }, [fetchExchangeRates])

  // Generate currencies list based on available exchange rates
  const currencies = Object.keys(exchangeRates).map((code) => ({
    value: code,
    label: `${code} - ${currencyNames[code] || code}`,
    symbol: currencySymbols[code] || code
  }))

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
              <span className="text-sm w-6 text-center">{selectedCurrency.symbol}</span>
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
          <CommandList className="max-h-60">
            <CommandGroup>
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
                  <span className="mr-3 text-sm w-6 text-center">{currency.symbol}</span>
                  <span>{currency.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}