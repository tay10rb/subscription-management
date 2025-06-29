import * as React from "react"
import { DayPicker, CaptionProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export type EnhancedCalendarProps = React.ComponentProps<typeof DayPicker> & {
  onMonthChange?: (date: Date) => void
}

// Custom caption component with year/month dropdowns
function EnhancedCaption({ displayMonth }: CaptionProps & { onMonthChange?: (date: Date) => void }) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 30 }, (_, i) => currentYear - 15 + i)
  const months = [
    { value: 0, label: "January" },
    { value: 1, label: "February" },
    { value: 2, label: "March" },
    { value: 3, label: "April" },
    { value: 4, label: "May" },
    { value: 5, label: "June" },
    { value: 6, label: "July" },
    { value: 7, label: "August" },
    { value: 8, label: "September" },
    { value: 9, label: "October" },
    { value: 10, label: "November" },
    { value: 11, label: "December" }
  ]

  const [isMonthOpen, setIsMonthOpen] = React.useState(false)
  const [isYearOpen, setIsYearOpen] = React.useState(false)

  const handleMonthChange = (_monthValue: string) => {
    // Note: This would need proper integration with DayPicker's navigation
    setIsMonthOpen(false)
  }

  const handleYearChange = (_yearValue: string) => {
    // Note: This would need proper integration with DayPicker's navigation
    setIsYearOpen(false)
  }

  return (
    <div className="flex justify-center items-center space-x-2 py-2">
      <Select 
        value={displayMonth.getMonth().toString()}
        onValueChange={handleMonthChange}
        open={isMonthOpen}
        onOpenChange={setIsMonthOpen}
      >
        <SelectTrigger className="w-32 h-8 text-sm">
          <SelectValue>
            {months[displayMonth.getMonth()].label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value.toString()}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select 
        value={displayMonth.getFullYear().toString()}
        onValueChange={handleYearChange}
        open={isYearOpen}
        onOpenChange={setIsYearOpen}
      >
        <SelectTrigger className="w-20 h-8 text-sm">
          <SelectValue>
            {displayMonth.getFullYear()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function EnhancedCalendar({
  className,
  classNames,
  showOutsideDays = true,
  onMonthChange,
  ...props
}: EnhancedCalendarProps) {
  const [month, setMonth] = React.useState<Date>(props.month || new Date())

  const handleMonthChange = (newMonth: Date) => {
    setMonth(newMonth)
    onMonthChange?.(newMonth)
  }

  // Helper function to safely call onSelect based on mode
  const handleDateSelect = (date: Date) => {
    if ('onSelect' in props && props.onSelect) {
      // For single mode (default), onSelect expects Date | undefined
      if (!props.mode || props.mode === 'single') {
        (props.onSelect as (date: Date | undefined) => void)(date)
      }
      // For multiple mode, onSelect expects Date[] | undefined
      else if (props.mode === 'multiple') {
        // This would need more complex logic for multiple selection
        // For now, we'll skip this case
      }
      // For range mode, onSelect expects DateRange | undefined
      else if (props.mode === 'range') {
        // This would need more complex logic for range selection
        // For now, we'll skip this case
      }
    }
  }

  return (
    <div className="space-y-2">
      {/* Quick date selection buttons */}
      <div className="flex justify-center space-x-1 pb-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const today = new Date()
            handleMonthChange(today)
            handleDateSelect(today)
          }}
          className="text-xs h-7"
        >
          Today
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            handleMonthChange(tomorrow)
            handleDateSelect(tomorrow)
          }}
          className="text-xs h-7"
        >
          Tomorrow
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const nextWeek = new Date()
            nextWeek.setDate(nextWeek.getDate() + 7)
            handleMonthChange(nextWeek)
            handleDateSelect(nextWeek)
          }}
          className="text-xs h-7"
        >
          Next Week
        </Button>
      </div>

      <DayPicker
        {...props}
        month={month}
        onMonthChange={handleMonthChange}
        showOutsideDays={showOutsideDays}
        className={cn("p-3", className)}
        components={{
          Caption: (captionProps) => <EnhancedCaption {...captionProps} onMonthChange={onMonthChange} />,
        }}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: cn(
            "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected].day-range-end)]:rounded-r-md",
            props.mode === "range"
              ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
              : "[&:has([aria-selected])]:rounded-md"
          ),
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-8 w-8 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_start: "day-range-start",
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
      />
    </div>
  )
}

EnhancedCalendar.displayName = "EnhancedCalendar"

export { EnhancedCalendar }
