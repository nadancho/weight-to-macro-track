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
        month: "grid grid-cols-7 gap-0 gap-y-1.5 w-full min-w-0",
        month_caption: "col-span-5 col-start-2 flex h-8 items-center justify-center",
        nav: "flex items-center gap-1 relative w-full",
        button_previous: "col-start-1 justify-self-center",
        button_next: "col-start-7 justify-self-center",
        caption_label: "text-sm font-medium",
        month_grid: "col-span-7 w-full border-collapse",
        table: "w-full border-collapse",
        weekdays: "flex col-span-7",
        weekday:
          "text-muted-foreground flex-1 rounded-md font-normal text-[0.8rem] min-w-0 flex justify-center",
        week: "flex w-full mt-1 col-span-7",
        day: "relative flex-1 min-w-0 p-0 text-center text-sm focus-within:relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        day_button: cn(
          "inline-flex items-center justify-center rounded-md text-sm size-8 p-0 font-normal",
          "hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "aria-selected:opacity-100"
        ),
        selected:
          "bg-primary text-primary-foreground bg-gradient-to-b from-white/15 to-transparent rounded-md hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground rounded-md",
        outside:
          "text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
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
          <Button variant="ghost" size="icon" className="size-8" {...buttonProps}>
            {children}
          </Button>
        ),
        NextMonthButton: ({ children, ...buttonProps }) => (
          <Button variant="ghost" size="icon" className="size-8" {...buttonProps}>
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
