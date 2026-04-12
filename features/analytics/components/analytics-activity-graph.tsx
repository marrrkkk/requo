"use client";

import { useMemo, useState } from "react";
import { format, eachDayOfInterval, startOfYear, endOfYear, getMonth } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BusinessAnalyticsData } from "@/features/analytics/types";

export function AnalyticsActivityGraph({
  data,
}: {
  data: BusinessAnalyticsData["activityGraph"];
}) {
  const { startYear, currentYear, activityMap } = data;
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const years = useMemo(() => {
    const arr = [];
    for (let y = currentYear; y >= startYear; y--) {
      arr.push(y);
    }
    return arr;
  }, [startYear, currentYear]);

  // Generate cells for the selected year
  const { cells, monthLabels } = useMemo(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    const end = endOfYear(new Date(selectedYear, 0, 1));

    const days = eachDayOfInterval({ start, end });

    // Pad to align the first day with Sunday (0)
    const firstDay = days[0]?.getDay() ?? 0;
    const padding = Array.from({ length: firstDay }).map(() => null);

    const fullCells = [...padding, ...days];

    // Calculate month labels
    const monthLabels: { label: string; colIndex: number }[] = [];
    let currentMonth = -1;

    for (let i = 0; i < fullCells.length; i++) {
       const day = fullCells[i];
       if (!day) continue; // skip padding

       const month = getMonth(day);
       if (month !== currentMonth) {
           // We only want to label if it falls roughly at the start of a week column
           // i / 7 is the column index
           monthLabels.push({ label: format(day, "MMM"), colIndex: Math.floor(i / 7) });
           currentMonth = month;
       }
    }

    return { cells: fullCells, monthLabels };
  }, [selectedYear]);

  return (
    <Card className="gap-0 mt-6 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle>Inquiry & quote activity</CardTitle>
        <CardDescription>
          Daily engagement over the year.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-6 w-full">
          {/* Main Graph Area */}
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide pb-2">
            <div className="flex gap-2 min-w-max">
              {/* Y-axis labels for Mon, Wed, Fri */}
              <div className="flex flex-col gap-[3px] text-[10px] text-muted-foreground font-medium pr-1 pt-[21px]">
                <div className="h-3 flex items-center" />
                <div className="h-3 flex items-center">Mon</div>
                <div className="h-3 flex items-center" />
                <div className="h-3 flex items-center">Wed</div>
                <div className="h-3 flex items-center" />
                <div className="h-3 flex items-center">Fri</div>
                <div className="h-3 flex items-center" />
              </div>

              <div className="flex flex-col">
                {/* Months X-axis */}
                <div className="relative h-4 mb-1 text-[10px] text-muted-foreground font-medium w-full">
                  {monthLabels.map((m, i) => (
                    <span 
                      key={i} 
                      className="absolute" 
                      style={{ left: `${m.colIndex * (12 + 3)}px` }} // 12px (size-3) + 3px gap
                    >
                      {m.label}
                    </span>
                  ))}
                </div>

                <TooltipProvider>
                  <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
                    {cells.map((date, i) => {
                      if (!date) {
                        return (
                          <div key={`pad-${i}`} className="size-3 rounded-sm" />
                        );
                      }

                      const isoDate = format(date, "yyyy-MM-dd");
                      const activity = activityMap[isoDate] ?? { inquiries: 0, quotes: 0 };
                      const totalActivity = activity.inquiries + activity.quotes;

                      let bgClass = "bg-surface-elevated border border-border/50";
                      if (totalActivity > 0) {
                        if (totalActivity === 1) bgClass = "bg-primary/30";
                        else if (totalActivity === 2) bgClass = "bg-primary/50";
                        else if (totalActivity <= 4) bgClass = "bg-primary/80";
                        else bgClass = "bg-primary";
                      } else {
                        bgClass = "bg-muted";
                      }

                      return (
                        <Tooltip key={isoDate} delayDuration={0}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "size-3 rounded-[2px] transition-all hover:ring-2 hover:ring-ring hover:ring-offset-1 hover:ring-offset-background",
                                bgClass,
                              )}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="flex flex-col gap-1 px-1">
                              <p className="font-semibold text-foreground/90">
                                {format(date, "MMM d, yyyy")}
                              </p>
                              <div className="text-xs text-muted-foreground flex flex-col pt-0.5 gap-0.5">
                                <span>
                                  <strong className="text-foreground">{activity.inquiries}</strong>{" "}
                                  {activity.inquiries === 1 ? "inquiry" : "inquiries"}
                                </span>
                                <span>
                                  <strong className="text-foreground">{activity.quotes}</strong>{" "}
                                  {activity.quotes === 1 ? "quote" : "quotes"}
                                </span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Year selector sidebar */}
          <div className="flex flex-col gap-1 shrink-0 w-full sm:w-24">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors w-full text-left sm:text-center",
                  year === selectedYear 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
