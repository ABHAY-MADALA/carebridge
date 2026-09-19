"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyMetric, MetricKey } from "@/lib/schema";
import { METRICS } from "@/lib/health/metrics";

/*
  One metric over time with the patient's own baseline drawn across it. The
  point of the picture is the gap between the line and the baseline, not the
  absolute value, so the baseline is the visually louder element.
*/

export function MetricChart({
  metric,
  metrics,
  baselineValue,
  days = 30,
}: {
  metric: MetricKey;
  metrics: DailyMetric[];
  baselineValue: number | null;
  days?: number;
}) {
  const meta = METRICS[metric];

  const data = [...metrics]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days)
    .map((m) => ({
      date: m.date.slice(5).replace("-", "/"),
      value: m[metric],
    }));

  return (
    <figure>
      <figcaption className="label">
        {meta.label}
        {baselineValue !== null && (
          <span className="ml-2 normal-case text-muted">
            your usual: {meta.format(baselineValue)}
          </span>
        )}
      </figcaption>

      <div className="mt-2 h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "rgb(var(--muted))" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "rgb(var(--muted))" }}
              width={44}
              domain={["auto", "auto"]}
            />
            <Tooltip
              formatter={(v) => (typeof v === "number" ? meta.format(v) : String(v))}
              contentStyle={{
                background: "rgb(var(--surface))",
                border: "2px solid rgb(var(--line))",
                borderRadius: 12,
                color: "rgb(var(--ink))",
              }}
            />
            {baselineValue !== null && (
              <ReferenceLine
                y={baselineValue}
                stroke="rgb(var(--brand))"
                strokeDasharray="6 4"
                strokeWidth={2}
                label={{
                  value: "your usual",
                  position: "insideTopLeft",
                  fontSize: 11,
                  fill: "rgb(var(--brand))",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="rgb(var(--ink))"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* A chart alone is not accessible. The same information in words. */}
      <p className="sr-only">
        {meta.label} over the last {data.length} days.
        {baselineValue !== null && ` Your usual level is ${meta.format(baselineValue)}.`}
        {data.length > 0 &&
          typeof data[data.length - 1].value === "number" &&
          ` The most recent value is ${meta.format(data[data.length - 1].value as number)}.`}
      </p>
    </figure>
  );
}
