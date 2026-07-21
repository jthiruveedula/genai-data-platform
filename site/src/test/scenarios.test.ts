import { describe, expect, it } from 'vitest';
import { MODULES } from '../data/modules';
import { CASE_STUDIES } from '../data/scenarios';

const CLOUDS = ['gcp', 'aws', 'azure', 'oss'] as const;

describe('CASE_STUDIES registry', () => {
  it('covers every module exactly', () => {
    const moduleIds = MODULES.map((m) => m.id).sort();
    expect(Object.keys(CASE_STUDIES).sort()).toEqual(moduleIds);
  });

  it('gives every module a real story for every cloud', () => {
    for (const [id, entry] of Object.entries(CASE_STUDIES)) {
      for (const cloud of CLOUDS) {
        const story = entry[cloud];
        expect(story, `${id}.${cloud}`).toBeDefined();
        expect(story.company.length, `${id}.${cloud}.company`).toBeGreaterThan(0);
        expect(story.industry.length, `${id}.${cloud}.industry`).toBeGreaterThan(0);
      }
    }
  });

  it('cites a real, live-looking source URL for every story', () => {
    for (const [id, entry] of Object.entries(CASE_STUDIES)) {
      for (const cloud of CLOUDS) {
        expect(entry[cloud].sourceUrl, `${id}.${cloud}`).toMatch(/^https:\/\//);
      }
    }
  });

  it('gives every vignette real substance, not a placeholder stub', () => {
    for (const [id, entry] of Object.entries(CASE_STUDIES)) {
      for (const cloud of CLOUDS) {
        expect(entry[cloud].vignette.length, `${id}.${cloud}`).toBeGreaterThan(120);
      }
    }
  });

  it('makes every cloud story distinct from the others (not just a tagline swap)', () => {
    for (const [id, entry] of Object.entries(CASE_STUDIES)) {
      const companies = CLOUDS.map((cloud) => entry[cloud].company);
      const vignettes = CLOUDS.map((cloud) => entry[cloud].vignette);
      expect(new Set(vignettes).size, id).toBe(vignettes.length);
      // Companies may legitimately repeat across modules (e.g. the same
      // real company's story fits two topics), but never across clouds
      // within one module — that would just be the old tagline-swap bug.
      expect(new Set(companies).size, id).toBe(companies.length);
    }
  });

  it('flags every stretch (non-clean-fit) story honestly in its own vignette text', () => {
    for (const [id, entry] of Object.entries(CASE_STUDIES)) {
      for (const cloud of CLOUDS) {
        const story = entry[cloud];
        if (story.stretch) {
          expect(story.vignette.toLowerCase(), `${id}.${cloud}`).toMatch(/no (published|open-source|google cloud|aws|microsoft) .*(case study|story)|closest (real|published)/);
        }
      }
    }
  });
});
