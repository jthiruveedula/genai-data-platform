/**
 * Hero pipeline flythrough — ten wireframe cubes on the X axis that the
 * camera travels past as the hero section scrolls.
 *
 * WebGL can't read `var(--*)`, so the accent/ink/ground token values are
 * resolved from the document by the caller and converted to `THREE.Color`
 * here. No hexes are inlined in this renderer.
 */
import * as THREE from "three";

export type HeroColors = { accent: string; ink: string; ground: string };

type Gizmo = { group: THREE.Group; update: (t: number) => void };

type NodeData = { i: number; edge: THREE.LineBasicMaterial; giz: Gizmo };

/**
 * Each block runs the mechanic of its own stage inside the cube.
 *
 * Accent-coloured materials are registered in `accentMats` so the scene can
 * re-tint them when the cloud selection changes — THREE copies the colour
 * into each material, so mutating the shared `accent` alone isn't enough.
 */
function buildGizmo(
  i: number,
  s: number,
  accent: THREE.Color,
  ink: THREE.Color,
  accentMats: { color: THREE.Color }[],
): Gizmo {
  const g = new THREE.Group();
  const inkMat = () => new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.75 });
  const redMat = () => {
    const m = new THREE.LineBasicMaterial({ color: accent });
    accentMats.push(m);
    return m;
  };
  const wire = (w: number, h: number, d: number, mat: THREE.LineBasicMaterial) =>
    new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), mat);
  const cloud = (n: number, size: number, color: THREE.Color) => {
    const a = new Float32Array(n * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(a, 3));
    const mat = new THREE.PointsMaterial({ color: color, size: size });
    if (color === accent) accentMats.push(mat);
    return new THREE.Points(geo, mat);
  };
  const r = (k: number) => {
    const x = Math.sin(k * 91.7) * 4375.85;
    return x - Math.floor(x);
  };
  const u = s * 0.34;
  const parts: THREE.LineSegments[] = [];
  let up: (t: number) => void = () => {};

  if (i === 0) {
    // documents arriving
    for (let k = 0; k < 3; k++) {
      const p = wire(u * 1.6, u * 0.06, u * 1.1, inkMat());
      g.add(p);
      parts.push(p);
    }
    up = (t) =>
      parts.forEach((p, k) => {
        const f = (t * 0.4 + k / 3) % 1;
        p.position.set((1 - f) * s * 1.9, Math.sin(f * 6) * u * 0.5, (0.5 - r(k)) * u);
        p.rotation.z = f * 1.8;
        (p.material as THREE.LineBasicMaterial).opacity = Math.min(1, f * 4) * (1 - f) * 1.4;
      });
  } else if (i === 1) {
    // rows landing in storage
    for (let k = 0; k < 4; k++) {
      const p = wire(u * 1.8, u * 0.12, u * 1.4, inkMat());
      p.position.y = -u + k * u * 0.55;
      g.add(p);
      parts.push(p);
    }
    up = (t) =>
      parts.forEach((p, k) => {
        const f = (t * 0.55) % 5;
        p.visible = f > k;
        (p.material as THREE.LineBasicMaterial).color.set(k === Math.floor(f) ? accent : ink);
      });
  } else if (i === 2) {
    // cut into chunks
    for (let k = 0; k < 4; k++) {
      const p = wire(u * 1.7, u * 0.34, u * 1.7, k === 1 ? redMat() : inkMat());
      g.add(p);
      parts.push(p);
    }
    up = (t) => {
      const o = (Math.sin(t * 1.1) * 0.5 + 0.5) * u * 0.5;
      parts.forEach((p, k) => {
        p.position.y = (k - 1.5) * (u * 0.4 + o);
      });
    };
  } else if (i === 3) {
    // chunks collapse into a vector
    const pts = cloud(40, 0.1, accent);
    g.add(pts);
    for (let k = 0; k < 3; k++) {
      const p = wire(u * 1.4, u * 0.2, u * 1.2, inkMat());
      g.add(p);
      parts.push(p);
    }
    up = (t) => {
      const f = (t * 0.45) % 1,
        e = f < 0.8 ? f / 0.8 : 1;
      parts.forEach((p, k) => {
        p.position.set(-u * 1.2 * (1 - e), (k - 1) * u * 0.6 * (1 - e), 0);
        p.scale.setScalar(1 - e * 0.8);
      });
      const a = pts.geometry.attributes.position.array as Float32Array;
      for (let k = 0; k < 40; k++) {
        const rad = u * (0.15 + (1 - e) * 1.2);
        a[k * 3] = (r(k) - 0.5) * rad * 2;
        a[k * 3 + 1] = (r(k + 9) - 0.5) * rad * 2;
        a[k * 3 + 2] = (r(k + 17) - 0.5) * rad * 2;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    };
  } else if (i === 4) {
    // clustered index
    const pts = cloud(90, 0.09, ink);
    g.add(pts);
    const a = pts.geometry.attributes.position.array as Float32Array;
    for (let k = 0; k < 90; k++) {
      const c = k % 3,
        cx = [-0.6, 0.5, 0][c] * u,
        cy = [0.4, 0.5, -0.6][c] * u,
        cz = [0.3, -0.5, 0.4][c] * u;
      a[k * 3] = cx + (r(k) - 0.5) * u * 0.7;
      a[k * 3 + 1] = cy + (r(k + 3) - 0.5) * u * 0.7;
      a[k * 3 + 2] = cz + (r(k + 7) - 0.5) * u * 0.7;
    }
    up = (t) => {
      g.rotation.y = t * 0.5;
      g.rotation.x = Math.sin(t * 0.3) * 0.3;
    };
  } else if (i === 5) {
    // query probe + expanding search
    const probe = wire(u * 0.3, u * 0.3, u * 0.3, redMat());
    g.add(probe);
    const ringMat = new THREE.LineBasicMaterial({ color: accent, transparent: true });
    accentMats.push(ringMat);
    const ring = wire(u * 2, u * 2, u * 2, ringMat);
    g.add(ring);
    const pts = cloud(50, 0.08, ink);
    g.add(pts);
    const a = pts.geometry.attributes.position.array as Float32Array;
    for (let k = 0; k < 50; k++) {
      a[k * 3] = (r(k) - 0.5) * u * 2;
      a[k * 3 + 1] = (r(k + 5) - 0.5) * u * 2;
      a[k * 3 + 2] = (r(k + 11) - 0.5) * u * 2;
    }
    up = (t) => {
      const f = (t * 0.7) % 1;
      ring.scale.setScalar(0.2 + f);
      (ring.material as THREE.LineBasicMaterial).opacity = 1 - f;
      probe.rotation.set(t, t * 0.7, 0);
    };
  } else if (i === 6) {
    // candidates reordering
    for (let k = 0; k < 4; k++) {
      const p = wire(u * 1.6, u * 0.16, u * 0.16, k === 0 ? redMat() : inkMat());
      p.position.z = (k - 1.5) * u * 0.45;
      g.add(p);
      parts.push(p);
    }
    up = (t) => {
      const f = Math.sin(t * 1.2) * 0.5 + 0.5;
      parts.forEach((p, k) => {
        p.position.y = ((k % 2 ? k : 3 - k) - 1.5) * u * 0.5 * (1 - f) + (k - 1.5) * u * 0.5 * f;
        p.scale.x = 0.5 + (3 - k) * 0.18;
      });
    };
  } else if (i === 7) {
    // prompt assembling with citations
    for (let k = 0; k < 5; k++) {
      const p = wire(u * 1.7, u * 0.09, u * 0.09, k === 3 ? redMat() : inkMat());
      p.position.y = (k - 2) * u * 0.42;
      g.add(p);
      parts.push(p);
    }
    up = (t) => {
      const f = (t * 1.1) % 6.5;
      parts.forEach((p, k) => {
        p.visible = f > k;
        p.scale.x = Math.min(1, Math.max(0, f - k));
      });
    };
  } else if (i === 8) {
    // generation core
    const core = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(u * 0.9, 0)),
      redMat(),
    );
    g.add(core);
    const shell = wire(u * 1.7, u * 1.7, u * 1.7, inkMat());
    g.add(shell);
    up = (t) => {
      core.rotation.set(t * 1.4, t * 1.9, 0);
      core.scale.setScalar(0.9 + Math.sin(t * 6) * 0.1);
      shell.rotation.y = -t * 0.3;
    };
  } else {
    // cited answer
    const beam = wire(u * 0.24, u * 2.4, u * 0.24, redMat());
    g.add(beam);
    for (let k = 0; k < 3; k++) {
      const p = wire(u * 0.5, u * 0.12, u * 0.12, redMat());
      p.position.set(u * 0.9, (k - 1) * u * 0.5, 0);
      g.add(p);
      parts.push(p);
    }
    up = (t) => {
      beam.scale.y = 0.7 + Math.sin(t * 3) * 0.25;
      parts.forEach((p, k) => {
        p.visible = (t * 1.4) % 4 > k;
      });
    };
  }
  return { group: g, update: up };
}

export function createHeroScene(host: HTMLElement, colors: HeroColors, reduce: boolean) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.appendChild(renderer.domElement);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";

  const accent = new THREE.Color(colors.accent);
  const ink = new THREE.Color(colors.ink);
  const group = new THREE.Group();
  scene.add(group);

  const grid = new THREE.GridHelper(120, 40, ink, ink);
  (grid.material as THREE.Material).opacity = 0.13;
  (grid.material as THREE.Material).transparent = true;
  grid.position.y = -7;
  group.add(grid);

  /** Every material carrying the accent, re-tinted by `setAccent`. */
  const accentMats: { color: THREE.Color }[] = [];

  const N = 10,
    gap = 4.4;
  const nodes: THREE.Group[] = [];
  for (let i = 0; i < N; i++) {
    const s = i === 9 ? 2.5 : 1.7;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(s, s, s),
      new THREE.MeshBasicMaterial({ color: colors.ground, transparent: true, opacity: 0.55 }),
    );
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(s, s, s)),
      new THREE.LineBasicMaterial({ color: ink }),
    );
    const holder = new THREE.Group();
    holder.add(box);
    holder.add(edge);
    holder.position.set((i - (N - 1) / 2) * gap, 0, 0);
    const giz = buildGizmo(i, s, accent, ink, accentMats);
    holder.add(giz.group);
    holder.userData = { i: i, edge: edge.material as THREE.LineBasicMaterial, giz: giz } satisfies NodeData;
    group.add(holder);
    nodes.push(holder);
  }

  const spine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3((-(N - 1) / 2) * gap, 0, 0),
      new THREE.Vector3(((N - 1) / 2) * gap, 0, 0),
    ]),
    new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.35 }),
  );
  group.add(spine);

  const P = 220,
    pos = new Float32Array(P * 3);
  const seeds: number[] = [];
  for (let i = 0; i < P; i++) {
    seeds.push(Math.random());
    pos[i * 3] = 0;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 1.4;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pointsMat = new THREE.PointsMaterial({ color: accent, size: 0.16 });
  accentMats.push(pointsMat);
  const points = new THREE.Points(pg, pointsMat);
  group.add(points);

  const span = gap * (N - 1);
  const v3 = new THREE.Vector3();
  let lead = 0;

  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width) return;
    renderer.setSize(r.width, r.height, false);
    cam.aspect = r.width / r.height;
    cam.updateProjectionMatrix();
  }

  /** One frame: camera travel, per-cube idle drift, pass reaction, particles. */
  function frame(hp: number, time: number) {
    const half = span / 2;
    const wide = window.innerWidth > 900;
    lead = hp * 9.4;
    const leadX = -half + (lead / 9) * span;
    const drift = reduce ? 0 : Math.sin(time * 0.2) * 0.05;

    group.rotation.y = -0.5 + hp * 0.5 + drift;
    group.rotation.x = 0.3 - hp * 0.24;
    const bias = wide ? -span * 0.24 * (1 - Math.min(1, hp / 0.4)) : 0;
    cam.position.set(leadX - 9 + bias, 3.6 - hp * 2.2, 25 - hp * 9);
    cam.lookAt(leadX + 4 + bias, 0.2, 0);

    nodes.forEach((n) => {
      const data = n.userData as NodeData;
      const d = lead - data.i;
      const on = d > 0;
      data.edge.color.set(on ? accent : ink);
      const pop = d > 0 && d < 1 ? Math.sin(d * Math.PI) * 0.22 : 0;
      n.scale.setScalar(1 + pop + (reduce ? 0 : Math.sin(time * 1.2 + data.i) * 0.04));
      if (!reduce) {
        const ph = time * 0.6 + data.i * 0.9;
        n.position.y = Math.sin(ph) * 0.55 + pop * 1.2;
        n.position.z = Math.cos(ph * 0.7) * 0.5;
        n.rotation.set(Math.sin(ph * 0.5) * 0.12, time * 0.22 + data.i * 0.4, Math.cos(ph * 0.4) * 0.08);
      }
      const giz = data.giz;
      if (giz) {
        const live = d > -1.6;
        giz.group.visible = live;
        if (live && !reduce) giz.update(time + data.i * 0.6);
      }
    });

    const arr = points.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < seeds.length; i++) {
      const f = (seeds[i] + time * 0.1) % 1;
      arr[i * 3] = -half + f * span;
    }
    points.geometry.attributes.position.needsUpdate = true;
    renderer.render(scene, cam);
  }

  /**
   * Position the DOM labels from each node's real world matrix — the labels
   * are tied to the cubes by the same projection the renderer uses, not by
   * a parallel guess at where they landed.
   */
  function projectLabels(labels: HTMLElement[]) {
    if (!labels.length) return;
    const rect = host.getBoundingClientRect();
    labels.forEach((el, i) => {
      const n = nodes[i];
      if (!n) return;
      const near = 1 - Math.min(1, Math.abs(lead - 0.5 - i) / 1.5);
      if (near <= 0.02) {
        el.style.opacity = "0";
        return;
      }
      v3.set(0, 1.5, 0).applyMatrix4(n.matrixWorld).project(cam);
      const x = (v3.x * 0.5 + 0.5) * rect.width,
        y = (-v3.y * 0.5 + 0.5) * rect.height;
      const off = v3.z > 1 || x < 40 || x > rect.width - 40;
      el.style.opacity = off ? "0" : String(near);
      el.style.transform = "translate3d(" + x.toFixed(1) + "px," + (y - 14 - near * 10).toFixed(1) + "px,0)";
    });
  }

  /**
   * Re-tint the scene when the cloud selection changes. Cube edges read the
   * shared `accent` every frame, so mutating it covers them; every other
   * accent material holds its own copy and is updated here.
   */
  function setAccent(hex: string) {
    accent.set(hex);
    accentMats.forEach((m) => m.color.set(accent));
  }

  function dispose() {
    renderer.dispose();
    renderer.domElement.remove();
  }

  resize();

  return { frame, projectLabels, resize, setAccent, dispose };
}
