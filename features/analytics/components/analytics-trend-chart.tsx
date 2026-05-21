"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TrendPoint } from "@/features/analytics/types";

export function AnalyticsTrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle>12-week trend</CardTitle>
        <CardDescription>
          Weekly views, submissions, quotes sent, and accepted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                  fontSize: "0.8rem",
                }}
              />
              <Area
                type="monotone"
                dataKey="formViews"
                name="Form views"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.1)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="inquirySubmissions"
                name="Inquiries"
                stroke="hsl(var(--accent-foreground))"
                fill="hsl(var(--accent) / 0.15)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="quotesSent"
                name="Quotes sent"
                stroke="#6366f1"
                fill="rgba(99, 102, 241, 0.08)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="acceptedQuotes"
                name="Accepted"
                stroke="#10b981"
                fill="rgba(16, 185, 129, 0.08)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
