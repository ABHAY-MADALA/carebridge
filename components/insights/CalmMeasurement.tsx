"use client";
import type { DailyMetric, MetricKey } from "@/lib/schema";
import { METRICS } from "@/lib/health/metrics";
import { measurementComparison } from "@/lib/health/measurementComparison";
import { useT } from "@/components/a11y/useT";

export function CalmMeasurement({ metric, metrics, baselineValue, days }: { metric: MetricKey; metrics: DailyMetric[]; baselineValue: number | null; days: number }) {
  const { lang } = useT();
  const es = lang === "es";
  const { recent, direction } = measurementComparison(metrics, metric, baselineValue, days);
  const labels = { painLevel: "Dolor", fatigueLevel: "Fatiga", sleepMinutes: "Sueño", steps: "Actividad", restingHeartRate: "Frecuencia cardíaca en reposo" };
  const format = (v: number | null) => v === null ? (es ? "Sin registrar" : "Not recorded") : metric === "steps" && es ? `${Math.round(v).toLocaleString("es")} pasos` : METRICS[metric].format(v);
  const interpretation = es
    ? { higher: "Más alto que tu nivel habitual", lower: "Más bajo que tu nivel habitual", same: "Sin cambios respecto a tu nivel habitual", unknown: "Aún no hay datos suficientes para comparar" }
    : { higher: "Higher than your usual level", lower: "Lower than your usual level", same: "Unchanged from your usual level", unknown: "Not enough recorded information to compare" };
  return <article className="border-b border-line py-5" aria-label={es ? labels[metric] : METRICS[metric].label}>
    <h3 className="font-semibold">{es ? labels[metric] : METRICS[metric].label}</h3>
    <dl className="my-3 flex flex-wrap gap-x-10 gap-y-2">
      <div><dt className="text-sm text-muted">{es ? "Habitual" : "Usual"}</dt><dd>{format(baselineValue)}</dd></div>
      <div><dt className="text-sm text-muted">{es ? "Reciente" : "Recent"}</dt><dd>{format(recent)}</dd></div>
    </dl>
    <p className="text-sm">{interpretation[direction]}</p>
  </article>;
}
