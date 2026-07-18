/**
 * ECharts wiring for ModuleRecap charts. Kept out of the component script so
 * the echarts bundle becomes its own chunk, dynamically imported only when a
 * chart-bearing recap actually scrolls into view.
 */

import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkPointComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { CHART_BUILDERS, type RecapChartId, type RecapPalette } from "./recap-chart-options";

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, MarkPointComponent, CanvasRenderer]);

function livePalette(): RecapPalette {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    accent: read("--accent", "#7aa2ff"),
    text: read("--text", "#e6e9f0"),
    textSecondary: read("--text-secondary", "#9aa3b5"),
    border: read("--border", "#2a2f3d"),
    fontMono: read("--font-mono", "monospace"),
    fontBody: read("--font-body", "sans-serif"),
  };
}

/**
 * Mounts a recap chart into `el` and keeps it in sync with cloud/theme
 * switches (both change the CSS custom properties the palette reads) and
 * container resizes. Returns the chart instance.
 */
export function mountRecapChart(el: HTMLElement, chartId: RecapChartId) {
  const chart = echarts.init(el);
  const render = () => chart.setOption(CHART_BUILDERS[chartId](livePalette()), true);
  render();

  document.addEventListener("gdp:cloud-change", render);
  const themeObserver = new MutationObserver(render);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  const resizeObserver = new ResizeObserver(() => chart.resize());
  resizeObserver.observe(el);

  return chart;
}
