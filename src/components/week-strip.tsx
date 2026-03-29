"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, startOfWeek } from "date-fns";
import { useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

type WeekStripProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  weekStartsOn: 0 | 1;
  loggedDates: Set<string>;
};

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayISO(): string {
  return toISO(new Date());
}

export function WeekStrip({ selectedDate, onSelect, weekStartsOn, loggedDates }: WeekStripProps) {
  const directionRef = useRef<-1 | 1>(1);

  const days = useMemo(() => {
    const selected = new Date(selectedDate + "T12:00:00");
    const ws = startOfWeek(selected, { weekStartsOn });
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(ws, i);
      return {
        date: toISO(d),
        dayName: format(d, "EEE"),
        dayNum: d.getDate(),
      };
    });
  }, [selectedDate, weekStartsOn]);

  // Key for AnimatePresence — the week's start date
  const weekKey = days[0].date;
  const today = todayISO();

  const shiftWeek = (direction: -1 | 1) => {
    directionRef.current = direction;
    const current = new Date(selectedDate + "T12:00:00");
    onSelect(toISO(addDays(current, direction * 7)));
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => shiftWeek(-1)}
        className="flex items-center justify-center size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
        aria-label="Previous week"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="popLayout" custom={directionRef.current}>
          <motion.div
            key={weekKey}
            custom={directionRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex justify-between gap-0.5"
          >
            {days.map(({ date, dayName, dayNum }) => {
              const isSelected = date === selectedDate;
              const isToday = date === today;
              const isLogged = loggedDates.has(date);

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onSelect(date)}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 min-h-[52px] transition-colors",
                    "active:scale-95 transition-transform duration-75",
                    isSelected
                      ? "bg-foreground text-background"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-medium uppercase leading-none",
                      !isSelected && "text-muted-foreground"
                    )}
                  >
                    {dayName}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold leading-none tabular-nums",
                      isToday && !isSelected && "text-primary"
                    )}
                  >
                    {dayNum}
                  </span>
                  <div className="h-1 flex items-center justify-center">
                    {isLogged && (
                      <div
                        className={cn(
                          "size-1 rounded-full",
                          isSelected ? "bg-background/60" : "bg-primary/60"
                        )}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => shiftWeek(1)}
        className="flex items-center justify-center size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
        aria-label="Next week"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
