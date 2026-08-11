# The scroll world — how `/world/` is made

`site/src/pages/world.astro` scrubs six video clips with scroll position. This
directory is where those clips come from: the source of the flight, and the
script that cuts and encodes it. Nothing here runs at build time — the page
ships the rendered assets in `site/public/world/`, and this pipeline is only
re-run when the film itself changes.

## What it is

One continuous 30-second camera flight through six rooms of the platform —
raw documents, ingest and chunking, embeddings, the index, reranking and the
model, and the grounded answer. It is a three.js scene rendered frame by frame
by [Remotion](https://remotion.dev), driven through
[OpenMontage](https://github.com/calesthio/OpenMontage)'s *atelier* composition
path (`render_runtime: remotion`, `composition_mode: atelier` — a hand-authored,
project-local composition rather than its stock scene registry).

## Why local rendering instead of a generative video API

The `scroll-world` skill this page's engine comes from generates its scenes and
camera moves with a paid image/video API, and spends most of its process on one
problem: making generated clips join without a visible pop. Every clip is a
separate generation, so consecutive clips only *approximately* agree, and the
fix is a careful frame-handoff protocol plus a crossfade to hide the residue.

A deterministic renderer removes the problem instead of managing it:

| | Generated chain | This pipeline |
|---|---|---|
| Seams | Frame-matched by protocol, crossfaded to hide drift | Adjacent frames of a single take — nothing to hide |
| Reproducibility | New generation each run | Same seed, same 900 frames, byte for byte |
| Portrait version | A second full render, ~2× the metered spend | Free — it is the same scene at another aspect |
| Art direction | Prompt-steered, approximate | Reads the site's own Modernist tokens, exactly |
| Cost per re-cut | Metered per clip | Electricity |
| Failure mode | Content-filter false positives, re-rolls | A TypeScript error |

The trade is real and worth stating: this world is vector line art, not
photoreal, because the renderer draws what the code says and nothing more.
For a diorama or a photographic world, a generative pipeline still wins. For a
technical-blueprint aesthetic on a Modernist site, drawing it is both cheaper
and *better matched* — the film uses the page's palette because it reads the
same values, rather than because a prompt described them.

OpenMontage's provider roster includes generative video backends (Kling, Veo,
Runway, Higgsfield and others). This build deliberately uses none of them: the
whole pipeline is the free local path — Remotion for rendering, FFmpeg for the
cut and encode — so it needs no API key, no credits, and no network.

## Files

- `index.tsx` — the Remotion entry: two compositions, landscape (1280×720) and
  native portrait (720×1280), over the same scene graph.
- `World.tsx` — the flight. Scene builders for the six stations plus the camera.
  `z(t)` is strictly linear in time so the camera never reverses; the expressive
  motion lives in the lateral sway and in what the stations do as you pass.
- `world-scenes.ts` — station layout, the Modernist palette, and a seeded PRNG.
  Nothing may call `Math.random()` or read the clock: a frame must be a pure
  function of its index or the "one take" guarantee is gone.
- `encode-legs.sh` — cuts the 900-frame render into six 150-frame legs and
  encodes desktop + phone variants and their posters.

## Re-running it

Requires an [OpenMontage](https://github.com/calesthio/OpenMontage) checkout
(its `remotion-composer/` supplies the Remotion toolchain) plus `three`, and
FFmpeg on `$PATH`. Nothing is needed from this repo's own `node_modules`.

```bash
# 1. Put the composition inside the composer, so Remotion's bundler resolves
#    its node_modules (this is OpenMontage's atelier contract).
cd /path/to/OpenMontage/remotion-composer
npm install three@0.185.1
mkdir -p projects/genai-platform-world
cp /path/to/genai-data-platform/tools/scroll-world/*.tsx \
   /path/to/genai-data-platform/tools/scroll-world/*.ts \
   projects/genai-platform-world/

# 2. Render both aspects as PNG sequences (~900 frames each, a few minutes).
WORK=/tmp/scroll-world
npx remotion render projects/genai-platform-world/index.tsx \
  PlatformWorld "$WORK/frames-desktop" --sequence --image-format=png --gl=angle
npx remotion render projects/genai-platform-world/index.tsx \
  PlatformWorldPortrait "$WORK/frames-mobile" --sequence --image-format=png --gl=angle

# 3. Cut and encode, then publish.
bash /path/to/genai-data-platform/tools/scroll-world/encode-legs.sh "$WORK"
cp "$WORK"/out/*.mp4 "$WORK"/out/*.jpg \
   /path/to/genai-data-platform/site/public/world/
```

Preview a single frame while iterating on the scene:

```bash
npx remotion still projects/genai-platform-world/index.tsx PlatformWorld \
  /tmp/f.png --frame=375 --gl=angle
```

## If you change the timing

The page and the film agree on one number: **six sections of 150 frames at
30fps**. `index.tsx` sets it, `encode-legs.sh` slices on it, and
`world.astro` names six clips. Change the section count or the leg length and
all three have to move together — the scroll *distance* per section, though, is
purely a page concern (`scroll` / `linger` in `world.astro`) and can be retuned
without re-rendering anything.
