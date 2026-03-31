"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, PawPrint } from "lucide-react";
import {
  addDays,
  addMonths,
  format,
  getDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogStatus = "same-day" | "backfilled";

type DatePickerProps = {
  selectedDate: string;
  onSelect: (date: string) => void;
  weekStartsOn: 0 | 1;
  loggedDates: Map<string, LogStatus>;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  displayMonth: Date;
  onDisplayMonthChange: (month: Date) => void;
};

type DayInfo = {
  date: Date;
  iso: string;
  dayNum: number;
  isOutsideMonth: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayISO(): string {
  return toISO(new Date());
}

/** Build a grid of weeks (rows of 7 days) for a given month. */
function getMonthWeeks(year: number, month: number, weekStartsOn: 0 | 1): DayInfo[][] {
  const first = startOfMonth(new Date(year, month));
  const gridStart = startOfWeek(first, { weekStartsOn });
  const weeks: DayInfo[][] = [];
  let cursor = gridStart;

  // Generate 6 rows max (covers all months)
  for (let w = 0; w < 6; w++) {
    const week: DayInfo[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date: cursor,
        iso: toISO(cursor),
        dayNum: cursor.getDate(),
        isOutsideMonth: cursor.getMonth() !== month,
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
    // Stop if we've passed the month and filled at least 4 rows
    if (w >= 3 && week[0].date.getMonth() !== month) break;
  }
  return weeks;
}

/** Find which row index contains the selected date. */
function getActiveWeekIndex(weeks: DayInfo[][], selectedISO: string): number {
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i].some((d) => d.iso === selectedISO)) return i;
  }
  return 0;
}

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function orderedDayNames(weekStartsOn: 0 | 1): string[] {
  const names = [...DAY_NAMES_SHORT];
  if (weekStartsOn === 1) {
    names.push(names.shift()!);
  }
  return names;
}

// ---------------------------------------------------------------------------
// DayCell
// ---------------------------------------------------------------------------

function DayCell({
  day,
  isSelected,
  isToday,
  logStatus,
  isOutsideMonth,
  showDayName,
  onSelect,
}: {
  day: DayInfo;
  isSelected: boolean;
  isToday: boolean;
  logStatus: LogStatus | null;
  isOutsideMonth: boolean;
  showDayName: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl h-[44px] transition-colors",
        "active:scale-95 transition-transform duration-75",
        isSelected
          ? "bg-foreground text-background"
          : isOutsideMonth
            ? "opacity-30"
            : "hover:bg-muted/50"
      )}
    >
      {showDayName && (
        <span
          className={cn(
            "text-[10px] font-medium uppercase leading-none",
            !isSelected && "text-muted-foreground"
          )}
        >
          {DAY_NAMES_SHORT[getDay(day.date)]}
        </span>
      )}
      <span
        className={cn(
          "text-sm font-semibold leading-none tabular-nums",
          isToday && !isSelected && "text-primary"
        )}
      >
        {day.dayNum}
      </span>
      <div className="h-3 flex items-center justify-center">
        {logStatus && (
          <PawPrint
            className={cn(
              "size-3",
              isSelected
                ? "text-background/70"
                : logStatus === "same-day"
                  ? "text-green-400/80"
                  : "text-yellow-400/80"
            )}
          />
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// WeekRow
// ---------------------------------------------------------------------------

function WeekRow({
  week,
  selectedDate,
  today,
  loggedDates,
  showDayNames,
  onSelect,
}: {
  week: DayInfo[];
  selectedDate: string;
  today: string;
  loggedDates: Map<string, LogStatus>;
  showDayNames: boolean;
  onSelect: (iso: string) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {week.map((day) => (
        <DayCell
          key={day.iso}
          day={day}
          isSelected={day.iso === selectedDate}
          isToday={day.iso === today}
          logStatus={loggedDates.get(day.iso) ?? null}
          isOutsideMonth={day.isOutsideMonth}
          showDayName={showDayNames}
          onSelect={() => onSelect(day.iso)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DatePicker
// ---------------------------------------------------------------------------

export function DatePicker({
  selectedDate,
  onSelect,
  weekStartsOn,
  loggedDates,
  expanded,
  onExpandedChange,
  displayMonth,
  onDisplayMonthChange,
}: DatePickerProps) {
  const directionRef = useRef<-1 | 1>(1);
  const today = todayISO();

  const weeks = useMemo(
    () => getMonthWeeks(displayMonth.getFullYear(), displayMonth.getMonth(), weekStartsOn),
    [displayMonth, weekStartsOn]
  );

  const activeIdx = getActiveWeekIndex(weeks, selectedDate);
  const activeWeek = weeks[activeIdx];
  const dayNames = useMemo(() => orderedDayNames(weekStartsOn), [weekStartsOn]);

  // Week-key for slide animation when collapsed
  const weekKey = activeWeek?.[0]?.iso ?? selectedDate;

  const shiftWeek = (direction: -1 | 1) => {
    directionRef.current = direction;
    const next = addDays(new Date(selectedDate + "T12:00:00"), direction * 7);
    const nextISO = toISO(next);
    onSelect(nextISO);
    // Keep displayMonth in sync
    if (next.getMonth() !== displayMonth.getMonth() || next.getFullYear() !== displayMonth.getFullYear()) {
      onDisplayMonthChange(next);
    }
  };

  const handleDaySelect = (iso: string) => {
    onSelect(iso);
    const d = new Date(iso + "T12:00:00");
    if (d.getMonth() !== displayMonth.getMonth() || d.getFullYear() !== displayMonth.getFullYear()) {
      onDisplayMonthChange(d);
    }
    // Keep calendar open — let user browse freely
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="space-y-1.5">
      {/* Date label + Today + expand toggle */}
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-1 active:scale-[0.98] transition-transform"
      >
        <p className="text-lg font-bold tracking-tight">
          {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMM d")}
        </p>
        <div className="flex items-center gap-2">
          {selectedDate !== today && (
            <span
              className="text-sm font-semibold text-primary border border-primary/40 rounded-full px-2.5 py-0.5 hover:bg-primary/10 active:scale-95 transition-[colors,transform]"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(today);
                onDisplayMonthChange(new Date());
              }}
            >
              Today
            </span>
          )}
          <ChevronDown
            className={cn(
              "size-4.5 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Expanded: month nav + weekday header */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between px-1 pb-1">
              <button
                type="button"
                onClick={() => onDisplayMonthChange(subMonths(displayMonth, 1))}
                className="flex items-center justify-center size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-semibold tracking-wide">
                {format(displayMonth, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={() => onDisplayMonthChange(addMonths(displayMonth, 1))}
                className="flex items-center justify-center size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {/* Weekday abbreviation header */}
            <div className="flex gap-0.5 pb-1">
              {dayNames.map((name) => (
                <span
                  key={name}
                  className="flex-1 text-center text-[10px] font-medium uppercase text-muted-foreground/60"
                >
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded: all weeks in a single uniform grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden space-y-0.5"
          >
            {weeks.map((week) => (
              <WeekRow
                key={week[0].iso}
                week={week}
                selectedDate={selectedDate}
                today={today}
                loggedDates={loggedDates}
                showDayNames={false}
                onSelect={handleDaySelect}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed: active week with slide animation */}
      {!expanded && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="flex items-center justify-center size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="popLayout" custom={directionRef.current}>
              <motion.div
                key={weekKey}
                custom={directionRef.current}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <WeekRow
                  week={activeWeek}
                  selectedDate={selectedDate}
                  today={today}
                  loggedDates={loggedDates}
                  showDayNames={true}
                  onSelect={handleDaySelect}
                />
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
      )}
    </div>
  );
}
