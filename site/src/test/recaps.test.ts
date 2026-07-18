import { describe, expect, it } from 'vitest';
import { MODULES } from '../data/modules';
import { RECAPS } from '../data/recaps';
import {
  CHART_BUILDERS,
  finopsBreakevenMtok,
  vectorStorageGb,
  HOURS_PER_MONTH,
  type RecapPalette,
} from '../lib/recap-chart-options';
import pricing from '../data/pricing.json';

const palette: RecapPalette = {
  accent: '#7aa2ff',
  text: '#e6e9f0',
  textSecondary: '#9aa3b5',
  border: '#2a2f3d',
  fontMono: 'monospace',
  fontBody: 'sans-serif',
};

describe('RECAPS registry', () => {
  it('covers every module exactly', () => {
    const moduleIds = MODULES.map((m) => m.id).sort();
    expect(Object.keys(RECAPS).sort()).toEqual(moduleIds);
  });

  it('gives every recap a title, three takeaways, and a captioned visual', () => {
    for (const [id, recap] of Object.entries(RECAPS)) {
      expect(recap.title, id).toBeTruthy();
      expect(recap.takeaways, id).toHaveLength(3);
      expect(recap.visual.caption, id).toBeTruthy();
    }
  });

  it('only references chart builders that exist', () => {
    for (const recap of Object.values(RECAPS)) {
      if (recap.visual.kind === 'chart') {
        expect(CHART_BUILDERS[recap.visual.chart]).toBeTypeOf('function');
      }
    }
  });

  it('labels the illustrative chunking chart as illustrative in its caption', () => {
    const chunking = RECAPS['15-chunking'];
    if (chunking.visual.kind !== 'chart') throw new Error('chunking recap should be a chart');
    expect(chunking.visual.caption).toMatch(/illustrative/i);
  });
});

describe('chart builders', () => {
  it('every builder returns an option with at least one series', () => {
    for (const [id, build] of Object.entries(CHART_BUILDERS)) {
      const option = build(palette) as { series: unknown[] };
      expect(Array.isArray(option.series), id).toBe(true);
      expect(option.series.length, id).toBeGreaterThan(0);
    }
  });

  it('pricing bars carry the real verified list prices', () => {
    const option = CHART_BUILDERS['pricing-bars'](palette) as { series: { name: string; data: number[] }[] };
    const input = option.series.find((s) => s.name === 'Input')!;
    const output = option.series.find((s) => s.name === 'Output')!;
    expect(input.data).toEqual([pricing.gcp.input_per_mtok, pricing.aws.input_per_mtok, pricing.azure.input_per_mtok]);
    expect(output.data).toEqual([
      pricing.gcp.output_per_mtok,
      pricing.aws.output_per_mtok,
      pricing.azure.output_per_mtok,
    ]);
  });
});

describe('derived economics', () => {
  it('computes raw float32 storage from dimensions', () => {
    expect(vectorStorageGb(768)).toBeCloseTo(3.072);
    expect(vectorStorageGb(1536)).toBeCloseTo(6.144);
  });

  it('break-even volume equals GPU monthly cost over the cheapest output rate', () => {
    const gpuMonthly = pricing.oss.gpu_hour_usd * HOURS_PER_MONTH;
    const cheapest = Math.min(pricing.gcp.output_per_mtok, pricing.aws.output_per_mtok, pricing.azure.output_per_mtok);
    expect(finopsBreakevenMtok()).toBeCloseTo(gpuMonthly / cheapest);
  });
});
