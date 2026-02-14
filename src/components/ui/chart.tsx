"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  { label?: string; color?: string; icon?: React.ComponentType<{ className?: string }> }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer");
  }
  return context;
}

export function ChartContainer<T>({
  config,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ReactNode;
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn("w-full", className)}
        style={{ minHeight: "200px" }}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltip({ ...props }: React.ComponentProps<typeof Tooltip>) {
  return <Tooltip {...props} />;
}

type ChartTooltipContentProps = React.ComponentProps<typeof Tooltip>["content"] extends
  | infer C
  | undefined
  ? C extends (props: infer P) => React.ReactNode
    ? P
    : never
  : never;

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  hideLabel,
  className,
  ..._rest
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; dataKey?: string; color?: string; fill?: string }>;
  label?: string | number;
  labelFormatter?: (label: string) => React.ReactNode;
  valueFormatter?: (
    value: number,
    name: string,
    payloadEntry?: { payload?: Record<string, unknown>; dataKey?: string }
  ) => React.ReactNode;
  hideLabel?: boolean;
  className?: string;
  [key: string]: unknown;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const contentLabel =
    labelFormatter && label != null ? labelFormatter(String(label)) : label != null ? String(label) : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-md",
        className
      )}
    >
      {!hideLabel && contentLabel != null && (
        <p className="mb-1.5 font-medium text-muted-foreground">{contentLabel}</p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const configItem = config[key];
          const name = configItem?.label ?? item.name ?? key;
          const color = item.color ?? item.fill ?? configItem?.color;
          const value = item.value;
          const display =
            valueFormatter && typeof value === "number"
              ? valueFormatter(value, String(name), item)
              : value;
          return (
            <div key={key} className="flex items-center gap-2">
              {color != null && (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
              )}
              <span className="text-foreground">{name}</span>
              <span className="font-medium tabular-nums text-foreground">{display}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
