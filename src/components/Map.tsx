import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre 6 runs in a separate worker file. Naming it here lets Vite serve it in development and ship it in the production build.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { PHILIPPINES_CENTER } from "../lib/places";

maplibregl.setWorkerUrl(workerUrl);

// OpenFreeMap needs no key. To use another provider (MapTiler, Stadia, your own), set VITE_MAP_STYLE to its style URL.
const STYLE_URL = (import.meta.env.VITE_MAP_STYLE as string | undefined) ?? "https://tiles.openfreemap.org/styles/liberty";

export interface LatLng {
  latitude: number;
  longitude: number;
}

const toLngLat = (point: LatLng): [number, number] => [point.longitude, point.latitude];
const round = (value: number) => Math.round(value * 1e6) / 1e6;

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// Creates the map once, removes it when the component goes away, and hands it back when it is ready.
function useBaseMap(container: React.RefObject<HTMLDivElement | null>, center: LatLng, zoom: number, interactive = true) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [failed, setFailed] = useState(false);
  const initial = useRef({ center, zoom });

  useEffect(() => {
    if (!container.current) return;
    if (!webglAvailable()) {
      setFailed(true);
      return;
    }
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: STYLE_URL,
        center: toLngLat(initial.current.center),
        zoom: initial.current.zoom,
        attributionControl: { compact: true },
        interactive,
      });
    } catch {
      setFailed(true);
      return;
    }
    if (interactive) instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    setMap(instance);
    return () => {
      instance.remove();
      setMap(null);
    };
  }, [container, interactive]);

  return { map, failed };
}

function dropElement(): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "mappin";
  element.innerHTML = "<span></span>";
  return element;
}

interface Result {
  label: string;
  latitude: number;
  longitude: number;
}

// Free address search from OpenStreetMap (Nominatim). It runs only when the person presses Search,
// which keeps us within its fair-use rule of about one request a second.
async function searchPlaces(query: string): Promise<Result[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ph&accept-language=en&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Address search is not available right now");
  const rows = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>;
  return rows.map((row) => ({ label: row.display_name, latitude: Number(row.lat), longitude: Number(row.lon) }));
}

interface PickerProps {
  value: LatLng | null;
  // Where to open when there is no pin yet, for example the centre of the chosen city.
  center?: LatLng;
  onChange: (next: LatLng | null) => void;
}

// Lets an owner place the exact spot: click the map, drag the pin, search an address, or use their location.
export function MapPicker({ value, center, onChange }: PickerProps) {
  const container = useRef<HTMLDivElement>(null);
  const start = value ?? center ?? PHILIPPINES_CENTER;
  const { map, failed } = useBaseMap(container, start, value ? 16 : center ? 12 : 5);
  const marker = useRef<maplibregl.Marker | null>(null);
  const change = useRef(onChange);
  change.current = onChange;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");

  // Click to place the pin.
  useEffect(() => {
    if (!map) return;
    const onClick = (event: maplibregl.MapMouseEvent) => change.current({ latitude: round(event.lngLat.lat), longitude: round(event.lngLat.lng) });
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map]);

  // Keep the pin in step with the value: create, move, or remove it.
  useEffect(() => {
    if (!map) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (!marker.current) {
      const pin = new maplibregl.Marker({ element: dropElement(), draggable: true, anchor: "bottom" }).setLngLat(toLngLat(value)).addTo(map);
      pin.on("dragend", () => {
        const at = pin.getLngLat();
        change.current({ latitude: round(at.lat), longitude: round(at.lng) });
      });
      marker.current = pin;
    } else {
      marker.current.setLngLat(toLngLat(value));
    }
  }, [map, value]);

  // With no pin yet, follow the chosen city.
  useEffect(() => {
    if (map && !value && center) map.flyTo({ center: toLngLat(center), zoom: 12, duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, center?.latitude, center?.longitude]);

  const place = (point: LatLng, zoom = 16) => {
    onChange({ latitude: round(point.latitude), longitude: round(point.longitude) });
    map?.flyTo({ center: toLngLat(point), zoom, duration: 700 });
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setMessage("");
    try {
      const found = await searchPlaces(query.trim());
      setResults(found);
      if (found.length === 0) setMessage("No match. Try a street, barangay or landmark, or click the map.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) return setMessage("Your browser cannot share its location.");
    navigator.geolocation.getCurrentPosition(
      (position) => place({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setMessage("We could not get your location. Allow it in the browser, or click the map instead."),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  if (failed) {
    return (
      <div className="stack stack--sm">
        <div className="alert alert--warn">The map cannot load in this browser. You can still type the coordinates, or leave this empty.</div>
        <div className="grid-2">
          <label className="field"><span className="label">Latitude</span><input className="input" inputMode="decimal" value={value?.latitude ?? ""} onChange={(event) => event.target.value ? onChange({ latitude: Number(event.target.value), longitude: value?.longitude ?? 0 }) : onChange(null)} /></label>
          <label className="field"><span className="label">Longitude</span><input className="input" inputMode="decimal" value={value?.longitude ?? ""} onChange={(event) => onChange({ latitude: value?.latitude ?? 0, longitude: Number(event.target.value) })} /></label>
        </div>
      </div>
    );
  }

  return (
    <div className="stack stack--sm">
      <div className="mapsearch">
        <input className="input" aria-label="Search for an address or landmark" placeholder="Search a street, barangay or landmark" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void runSearch(); } }} />
        <button type="button" className="btn btn--ghost" disabled={searching || !query.trim()} onClick={() => void runSearch()}>{searching ? "Searching…" : "Search"}</button>
        <button type="button" className="btn btn--ghost" onClick={locateMe}>Use my location</button>
      </div>
      {results && results.length > 0 && (
        <ul className="mapresults" aria-label="Search results">
          {results.map((result) => (
            <li key={`${result.latitude},${result.longitude}`}>
              <button type="button" onClick={() => { place(result); setResults(null); }}>{result.label}</button>
            </li>
          ))}
        </ul>
      )}
      {message && <p className="field__hint">{message}</p>}
      <div ref={container} className="mapbox" role="application" aria-label="Map. Click to place the pin." />
      <div className="row row--between">
        <span className="field__hint">{value ? `Pin placed (${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}). Drag it to adjust.` : "Click the map to drop a pin on the exact spot."}</span>
        {value && <button type="button" className="link small" onClick={() => onChange(null)}>Remove pin</button>}
      </div>
    </div>
  );
}

// A read-only map with one pin, for a home's page.
export function StaticMap({ location, height = 280 }: { location: LatLng; height?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const { map, failed } = useBaseMap(container, location, 15);

  useEffect(() => {
    if (!map) return;
    const pin = new maplibregl.Marker({ element: dropElement(), anchor: "bottom" }).setLngLat(toLngLat(location)).addTo(map);
    return () => {
      pin.remove();
    };
  }, [map, location.latitude, location.longitude]);

  if (failed) return null;
  return <div ref={container} className="mapbox" style={{ height }} role="img" aria-label="Map showing where the home is" />;
}
