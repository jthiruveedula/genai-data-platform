import { describe, expect, it } from 'vitest';
import pricing from '../data/pricing.json';

// Phase 0 smoke test: proves Vitest can import + assert against real project
// data. Not a full contract test — just checks the shape later phases (and
// the cost calculator) rely on hasn't silently drifted.
describe('pricing.json', () => {
  const flavors = ['gcp', 'aws', 'azure', 'oss'] as const;

  it('has an entry for every cloud flavor', () => {
    for (const flavor of flavors) {
      expect(pricing).toHaveProperty(flavor);
    }
  });

  it.each(flavors)('%s has the expected numeric fields', (flavor) => {
    const entry = (pricing as Record<string, Record<string, unknown>>)[flavor];
    expect(typeof entry.model).toBe('string');
    expect(typeof entry.input_per_mtok).toBe('number');
    expect(typeof entry.output_per_mtok).toBe('number');
    expect(typeof entry.embedding_per_mtok).toBe('number');
  });
});
