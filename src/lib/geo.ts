import { geoContains, geoDistance } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import geoRaw from "../data/geo.json";

export type LngLat = [number, number];
export type CountryShape = Feature<Geometry, { name?: string }>;

const GEO = geoRaw as Record<string, { id: string | null; lat: number; lng: number }>;

export const EARTH_KM = 6371;
export const MAX_POINTS = 5000;
/** Inside this radius of the country itself a guess counts as exact — tiny
 *  island states are a few pixels wide even zoomed in. */
const EXACT_KM = 25;
/** How fast points fall away with distance. ~1000 km off still scores half. */
const FALLOFF_KM = 1500;

export type World = {
  /** Every shape in the atlas, for drawing — includes territories we never ask. */
  all: CountryShape[];
  /** Our alpha-2 code to its shape, where the atlas has one. */
  byCode: Record<string, CountryShape>;
};

let worldPromise: Promise<World> | null = null;

/** The 50m atlas is ~750 KB, so it is only fetched when map mode is opened. */
export function loadWorld(): Promise<World> {
  if (!worldPromise) {
    worldPromise = Promise.all([
      import("topojson-client"),
      import("world-atlas/countries-50m.json"),
    ]).then(([topo, atlas]) => {
      const data = (atlas as { default?: unknown }).default ?? atlas;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = data as any;
      const fc = topo.feature(t, t.objects.countries) as unknown as FeatureCollection<
        Geometry,
        { name?: string }
      >;
      const byId = new Map<string, CountryShape>();
      for (const f of fc.features) if (f.id != null) byId.set(String(f.id), f);
      const byCode: Record<string, CountryShape> = {};
      for (const [code, g] of Object.entries(GEO)) {
        const shape = g.id ? byId.get(g.id) : undefined;
        if (shape) byCode[code] = shape;
      }
      return { all: fc.features, byCode };
    });
    worldPromise.catch(() => {
      worldPromise = null; // let a retry fetch again
    });
  }
  return worldPromise;
}

export const centreOf = (code: string): LngLat => {
  const g = GEO[code];
  return g ? [g.lng, g.lat] : [0, 0];
};

function eachVertex(geom: Geometry, fn: (p: LngLat) => void) {
  switch (geom.type) {
    case "Polygon":
      geom.coordinates.forEach((ring) => ring.forEach((p) => fn(p as LngLat)));
      break;
    case "MultiPolygon":
      geom.coordinates.forEach((poly) =>
        poly.forEach((ring) => ring.forEach((p) => fn(p as LngLat)))
      );
      break;
    case "GeometryCollection":
      geom.geometries.forEach((g) => eachVertex(g, fn));
      break;
    default:
      break;
  }
}

export type Measure = {
  km: number;
  /** The point of the country closest to the guess — where the line is drawn to. */
  nearest: LngLat;
};

/** Distance from a guess to the country: zero inside it, otherwise to its
 *  nearest border vertex. Countries missing from the atlas use their centre. */
export function measure(guess: LngLat, code: string, world: World | null): Measure {
  const shape = world?.byCode[code];
  if (!shape) {
    const c = centreOf(code);
    return { km: geoDistance(guess, c) * EARTH_KM, nearest: c };
  }
  if (geoContains(shape, guess)) return { km: 0, nearest: guess };

  let best = Infinity;
  let nearest: LngLat = centreOf(code);
  eachVertex(shape.geometry, (p) => {
    const d = geoDistance(guess, p);
    if (d < best) {
      best = d;
      nearest = p;
    }
  });
  return { km: best * EARTH_KM, nearest };
}

export function pointsFor(km: number): number {
  if (km <= EXACT_KM) return MAX_POINTS;
  return Math.round(MAX_POINTS * Math.exp(-(km - EXACT_KM) / FALLOFF_KM));
}

export function formatKm(km: number): string {
  if (km < 1) return "0 km";
  if (km < 100) return `${Math.round(km)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

// --- personal record ---------------------------------------------------------

const KEY = "flagship:map:v1";

export type MapRecord = { best: number; games: number };

export function loadMapRecord(): MapRecord {
  try {
    const raw = localStorage.getItem(KEY);
    const p = raw ? JSON.parse(raw) : null;
    return {
      best: typeof p?.best === "number" ? p.best : 0,
      games: typeof p?.games === "number" ? p.games : 0,
    };
  } catch {
    return { best: 0, games: 0 };
  }
}

export function saveMapGame(total: number): MapRecord {
  const prev = loadMapRecord();
  const next = { best: Math.max(prev.best, total), games: prev.games + 1 };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode — the record just won't persist.
  }
  return next;
}
