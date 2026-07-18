import { describe, expect, it } from 'vitest';
import { MODULES } from '../data/modules';
import { PATHS } from '../data/paths';

// Guards the contract paths/[path].astro and ResumeChip.astro rely on:
// every module's `path` must resolve to a real PATHS entry, and PATHS itself
// must stay exactly the three known lanes (no silent typo/duplicate/drift).
describe('paths.ts', () => {
  const KNOWN_IDS = ['beginner', 'intermediate', 'advanced'] as const;

  it('has exactly the 3 known path ids', () => {
    const ids = PATHS.map((p) => p.id).sort();
    expect(ids).toEqual([...KNOWN_IDS].sort());
  });

  it('has unique ids', () => {
    const ids = PATHS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every MODULES[].path has a matching PATHS entry', () => {
    const pathIds = new Set(PATHS.map((p) => p.id));
    for (const module of MODULES) {
      expect(pathIds.has(module.path)).toBe(true);
    }
  });

  it('every module\'s path exists in PATHS (no orphaned modules)', () => {
    const pathIds = new Set(PATHS.map((p) => p.id));
    const orphaned = MODULES.filter((m) => !pathIds.has(m.path));
    expect(orphaned).toEqual([]);
  });
});
