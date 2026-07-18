/**
 * Pure ECharts option builders for ModuleRecap charts. No echarts import and
 * no DOM access — the component script resolves the live palette from CSS
 * custom properties and passes it in, so these stay unit-testable and re-run
 * cheaply on every cloud/theme change.
 *
 * Honest-copy rule: every series here is either real published pricing
 * (pricing.json, backed by the claim registry) or pure arithmetic derived
 * from it. The one deliberately illustrative chart (chunking) is labelled as
 * such by its caption in recaps.ts and draws shapes, not measurements.
 */

import pricing from "../data/pricing.json";

export interface RecapPalette {
  accent: string;
  text: string;
  textSecondary: string;
  border: string;
  fontMono: string;
  fontBody: string;
}

/** Hours in an average month (365.25 * 24 / 12) — used for GPU $/month. */
export const HOURS_PER_MONTH = 730;

const API_CLOUDS = ["gcp", "aws", "azure"] as const;
const CLOUD_LABELS: Record<(typeof API_CLOUDS)[number], string> = {
  gcp: "Gemini 3 Flash",
  aws: "Claude Haiku 4.5",
  azure: "GPT-5.6 Luna",
};

function baseAxisStyle(palette: RecapPalette) {
  return {
    axisLine: { lineStyle: { color: palette.border } },
    axisTick: { show: false },
    axisLabel: { color: palette.textSecondary, fontFamily: palette.fontMono, fontSize: 11 },
    splitLine: { lineStyle: { color: palette.border, opacity: 0.4 } },
  };
}

function baseGrid() {
  return { left: 48, right: 16, top: 42, bottom: 30, containLabel: false };
}

function baseLegend(palette: RecapPalette) {
  return {
    top: 0,
    left: 0,
    itemWidth: 12,
    itemHeight: 8,
    textStyle: { color: palette.textSecondary, fontFamily: palette.fontMono, fontSize: 11 },
  };
}

/** 00-foundations: fast-tier list prices per Mtok across the three API clouds. */
export function pricingBarsOption(palette: RecapPalette) {
  return {
    animationDuration: 600,
    legend: baseLegend(palette),
    grid: baseGrid(),
    xAxis: {
      type: "category",
      data: API_CLOUDS.map((c) => CLOUD_LABELS[c]),
      ...baseAxisStyle(palette),
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: "$ / Mtok",
      nameTextStyle: { color: palette.textSecondary, fontFamily: palette.fontMono, fontSize: 11 },
      ...baseAxisStyle(palette),
    },
    series: [
      {
        name: "Input",
        type: "bar",
        barGap: "10%",
        data: API_CLOUDS.map((c) => pricing[c].input_per_mtok),
        itemStyle: { color: palette.textSecondary, borderRadius: [3, 3, 0, 0] },
      },
      {
        name: "Output",
        type: "bar",
        data: API_CLOUDS.map((c) => pricing[c].output_per_mtok),
        itemStyle: { color: palette.accent, borderRadius: [3, 3, 0, 0] },
      },
    ],
  };
}

/**
 * 15-chunking: the shape of the trade-off, drawn as curves — deliberately
 * illustrative (the caption says so), because real precision numbers depend
 * entirely on the corpus being chunked.
 */
export function chunkingTradeoffOption(palette: RecapPalette) {
  const sizes = [64, 128, 256, 512, 1024, 2048];
  // Precision peaks at a middling chunk size then decays as chunks blur
  // together; context cost grows linearly with chunk size.
  const precision = [0.55, 0.78, 0.9, 0.84, 0.66, 0.45];
  const cost = sizes.map((s) => s / 2048);
  return {
    animationDuration: 600,
    legend: baseLegend(palette),
    grid: baseGrid(),
    xAxis: {
      type: "category",
      data: sizes.map((s) => `${s}`),
      name: "tokens / chunk",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: palette.textSecondary, fontFamily: palette.fontMono, fontSize: 11 },
      ...baseAxisStyle(palette),
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      max: 1,
      axisLabel: { show: false },
      ...baseAxisStyle(palette),
      splitLine: { lineStyle: { color: palette.border, opacity: 0.4 } },
    },
    series: [
      {
        name: "Retrieval precision (shape)",
        type: "line",
        smooth: true,
        symbol: "none",
        data: precision,
        lineStyle: { color: palette.accent, width: 2.5 },
      },
      {
        name: "Context cost (shape)",
        type: "line",
        smooth: true,
        symbol: "none",
        data: cost,
        lineStyle: { color: palette.textSecondary, width: 2, type: "dashed" },
      },
    ],
  };
}

/** Raw vector bytes for 1M float32 vectors at a given dimension, in GB. */
export function vectorStorageGb(dimensions: number, vectors = 1_000_000): number {
  return (dimensions * 4 * vectors) / 1e9;
}

/** 20-embeddings: storage for 1M float32 vectors by dimension — pure arithmetic. */
export function embeddingStorageOption(palette: RecapPalette) {
  const dims = [384, 768, 1536, 3072];
  return {
    animationDuration: 600,
    grid: baseGrid(),
    xAxis: {
      type: "category",
      data: dims.map((d) => `${d}d`),
      name: "dimensions",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: palette.textSecondary, fontFamily: palette.fontMono, fontSize: 11 },
      ...baseAxisStyle(palette),
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: "GB / 1M vectors",
      nameTextStyle: { color: palette.textSecondary, fontFamily: palette.fontMono, fontSize: 11 },
      ...baseAxisStyle(palette),
    },
    series: [
      {
        name: "Raw float32 vectors",
        type: "bar",
        barWidth: "45%",
        data: dims.map((d) => Number(vectorStorageGb(d).toFixed(2))),
        itemStyle: { color: palette.accent, borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: "top",
          color: palette.textSecondary,
          fontFamily: palette.fontMono,
          fontSize: 10,
          formatter: "{c} GB",
        },
      },
    ],
  };
}

/** Output-token Mtok/month at which a 24/7 GPU matches the cheapest API's output price. */
export function finopsBreakevenMtok(): number {
  const gpuMonthly = pricing.oss.gpu_hour_usd * HOURS_PER_MONTH;
  const cheapestOutput = Math.min(...API_CLOUDS.map((c) => pricing[c].output_per_mtok));
  return gpuMonthly / cheapestOutput;
}

/**
 * 75-finops: monthly cost vs output volume — the cheapest API's per-token
 * line against a flat 24/7 GPU line, both from pricing.json.
 */
export function finopsBreakevenOption(palette: RecapPalette) {
  const gpuMonthly = pricing.oss.gpu_hour_usd * HOURS_PER_MONTH;
  const cheapestOutput = Math.min(...API_CLOUDS.map((c) => pricing[c].output_per_mtok));
  const breakeven = finopsBreakevenMtok();
  const maxX = Math.ceil((breakeven * 2) / 50) * 50;
  const steps = 8;
  const xs = Array.from({ length: steps + 1 }, (_, i) => Math.round((maxX / steps) * i));
  return {
    animationDuration: 600,
    legend: baseLegend(palette),
    grid: baseGrid(),
    xAxis: {
      type: "category",
      data: xs.map((x) => `${x}`),
      name: "output Mtok / month",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: palette.textSecondary, fontFamily: palette.fontMono, fontSize: 11 },
      ...baseAxisStyle(palette),
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      name: "$ / month",
      nameTextStyle: { color: palette.textSecondary, fontFamily: palette.fontMono, fontSize: 11 },
      ...baseAxisStyle(palette),
    },
    series: [
      {
        name: `Cheapest API output ($${cheapestOutput}/Mtok)`,
        type: "line",
        symbol: "none",
        data: xs.map((x) => Number((x * cheapestOutput).toFixed(0))),
        lineStyle: { color: palette.accent, width: 2.5 },
      },
      {
        name: `24/7 GPU ($${pricing.oss.gpu_hour_usd}/hr)`,
        type: "line",
        symbol: "none",
        data: xs.map(() => Number(gpuMonthly.toFixed(0))),
        lineStyle: { color: palette.textSecondary, width: 2, type: "dashed" },
        markPoint: {
          symbol: "circle",
          symbolSize: 8,
          itemStyle: { color: palette.accent },
          label: {
            color: palette.textSecondary,
            fontFamily: palette.fontMono,
            fontSize: 10,
            formatter: `break-even ≈${Math.round(breakeven)} Mtok/mo`,
            position: "top",
            distance: 14,
          },
          data: [
            {
              coord: [xs.findIndex((x) => x >= breakeven), gpuMonthly],
            },
          ],
        },
      },
    ],
  };
}

export type RecapChartId = "pricing-bars" | "chunking-tradeoff" | "embedding-storage" | "finops-breakeven";

export const CHART_BUILDERS: Record<RecapChartId, (palette: RecapPalette) => object> = {
  "pricing-bars": pricingBarsOption,
  "chunking-tradeoff": chunkingTradeoffOption,
  "embedding-storage": embeddingStorageOption,
  "finops-breakeven": finopsBreakevenOption,
};
