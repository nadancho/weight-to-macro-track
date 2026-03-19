"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayPickerProps,
} from "react-day-picker";

export type CalendarProps = DayPickerProps;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      dir="ltr"
      navLayout="around"
      showOutsideDays={showOutsideDays}
      className={cn("w-fit min-w-0", className)}
      classNames={{
        ...defaults,
        months: "flex flex-col gap-2 sm:flex-row sm:gap-4",
        month: "grid grid-cols-7 gap-0 gap-y-1 w-full min-w-0",
        month_caption:
          "col-span-5 col-start-2 flex h-10 items-center justify-center",
        nav: "flex items-center gap-1 relative w-full",
        button_previous: "col-start-1 justify-self-center",
        button_next: "col-start-7 justify-self-center",
        caption_label: "text-sm font-semibold tracking-wide",
        month_grid: "col-span-7 w-full border-collapse",
        table: "w-full border-collapse",
        weekdays: "flex col-span-7 mb-1",
        weekday:
          "text-muted-foreground/60 flex-1 rounded-md font-medium text-xs uppercase tracking-wider min-w-0 flex justify-center",
        week: "flex w-full mt-0.5 col-span-7",
        day: cn(
          "relative flex-1 min-w-0 p-0.5 text-center text-sm focus-within:relative",
          "[&:has([aria-selected])]:bg-transparent"
        ),
        day_button: cn(
          "inline-flex items-center justify-center rounded-full text-sm w-10 h-10 p-0 font-normal transition-all duration-150",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "aria-selected:opacity-100"
        ),
        selected: cn(
          "bg-foreground text-background rounded-full",
          "hover:bg-foreground hover:text-background",
          "focus:bg-foreground focus:text-background"
        ),
        today: "ring-2 ring-muted-foreground/30 ring-inset rounded-full",
        outside: "opacity-20 aria-selected:opacity-70",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) => {
          if (orientation === "left" || orientation === "up") {
            return <ChevronLeft className="size-4" {...chevronProps} />;
          }
          return <ChevronRight className="size-4" {...chevronProps} />;
        },
        PreviousMonthButton: ({ children, ...buttonProps }) => (
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            {...buttonProps}
          >
            {children}
          </Button>
        ),
        NextMonthButton: ({ children, ...buttonProps }) => (
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            {...buttonProps}
          >
            {children}
          </Button>
        ),
        ...props.components,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
