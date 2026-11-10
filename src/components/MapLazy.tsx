import { lazy, Suspense } from "react";
import type { LatLng } from "./Map";

// The map library is large, so it loads only on the screens that show a map.
const Picker = lazy(() => import("./Map").then((module) => ({ default: module.MapPicker })));
const Static = lazy(() => import("./Map").then((module) => ({ default: module.StaticMap })));

const Loading = () => <div className="mapbox mapbox--loading">Loading map…</div>;

export const LazyMapPicker = (props: { value: LatLng | null; center?: LatLng; onChange: (next: LatLng | null) => void }) => (
  <Suspense fallback={<Loading />}><Picker {...props} /></Suspense>
);
export const LazyStaticMap = (props: { location: LatLng; height?: number }) => (
  <Suspense fallback={<Loading />}><Static {...props} /></Suspense>
);
