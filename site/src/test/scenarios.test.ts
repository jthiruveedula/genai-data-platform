import { describe, expect, it } from 'vitest';
import { MODULES } from '../data/modules';
import { SCENARIOS, ENTERPRISE, STARTUP } from '../data/scenarios';

describe('SCENARIOS registry', () => {
  it('covers every module exactly', () => {
    const moduleIds = MODULES.map((m) => m.id).sort();
    expect(Object.keys(SCENARIOS).sort()).toEqual(moduleIds);
  });

  it('gives every module one enterprise beat and one startup beat', () => {
    for (const [id, content] of Object.entries(SCENARIOS)) {
      expect(content.beats, id).toHaveLength(2);
      const kinds = content.beats.map((b) => b.company.kind).sort();
      expect(kinds, id).toEqual(['Enterprise', 'Startup']);
    }
  });

  it('reuses the same two named companies everywhere (a consistent thread, not one-offs)', () => {
    for (const [id, content] of Object.entries(SCENARIOS)) {
      const names = content.beats.map((b) => b.company.name).sort();
      expect(names, id).toEqual([ENTERPRISE.name, STARTUP.name].sort());
    }
  });

  it('gives every vignette real substance, not a placeholder stub', () => {
    for (const content of Object.values(SCENARIOS)) {
      for (const beat of content.beats) {
        expect(beat.vignette.length).toBeGreaterThan(60);
      }
    }
  });
});
