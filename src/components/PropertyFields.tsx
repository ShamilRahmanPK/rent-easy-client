import { useState } from "react";
import type { Property } from "../lib/types";
import { AMENITIES, PROPERTY_TYPES } from "../lib/format";
import { findPlace } from "../lib/places";
import { LazyMapPicker } from "./MapLazy";
import { CheckGroup, Field } from "./ui";

export interface PropertyFormValues {
  name: string;
  propertyType: string;
  description: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  landmark: string;
  country: string;
  latitude: string;
  longitude: string;
  yearBuilt: string;
  totalFloors: string;
  parkingSlots: string;
  amenities: string[];
}

export const emptyProperty: PropertyFormValues = {
  name: "",
  propertyType: "apartment_building",
  description: "",
  streetAddress: "",
  city: "",
  province: "",
  postalCode: "",
  landmark: "",
  country: "Philippines",
  latitude: "",
  longitude: "",
  yearBuilt: "",
  totalFloors: "",
  parkingSlots: "",
  amenities: [],
};

export function valuesFromProperty(property: Property): PropertyFormValues {
  return {
    name: property.name,
    propertyType: property.propertyType,
    description: property.description ?? "",
    streetAddress: property.address.street,
    city: property.address.city,
    province: property.address.province,
    postalCode: property.address.postalCode ?? "",
    landmark: property.address.landmark ?? "",
    country: property.address.country,
    latitude: property.location ? String(property.location.latitude) : "",
    longitude: property.location ? String(property.location.longitude) : "",
    yearBuilt: property.yearBuilt ? String(property.yearBuilt) : "",
    totalFloors: property.totalFloors ? String(property.totalFloors) : "",
    parkingSlots: property.parkingSlots !== null ? String(property.parkingSlots) : "",
    amenities: property.amenities,
  };
}

const number = (value: string) => (value.trim() === "" ? null : Number(value));
const text = (value: string) => (value.trim() === "" ? null : value.trim());

// Empty optional fields are sent as null so a person can also clear a value.
export function payloadFromValues(values: PropertyFormValues) {
  return {
    name: values.name.trim(),
    propertyType: values.propertyType,
    description: text(values.description),
    streetAddress: values.streetAddress.trim(),
    city: values.city.trim(),
    province: values.province.trim(),
    postalCode: text(values.postalCode),
    landmark: text(values.landmark),
    country: values.country.trim(),
    latitude: number(values.latitude),
    longitude: number(values.longitude),
    yearBuilt: number(values.yearBuilt),
    totalFloors: number(values.totalFloors),
    parkingSlots: number(values.parkingSlots),
    amenities: values.amenities,
  };
}

export function PropertyFields({ initial, busy, submitLabel, onSubmit }: { initial: PropertyFormValues; busy: boolean; submitLabel: string; onSubmit: (values: PropertyFormValues) => void }) {
  const [values, setValues] = useState(initial);
  const set = (key: keyof PropertyFormValues) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const place = findPlace(values.city);
  const cityCenter = place ? { latitude: place.latitude, longitude: place.longitude } : undefined;
  const onlyOneCoordinate = (values.latitude === "") !== (values.longitude === "");
  const valid = values.name.trim() && values.streetAddress.trim() && values.city.trim() && values.province.trim() && values.country.trim() && !onlyOneCoordinate;

  return (
    <form
      className="stack stack--lg"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="grid-2">
        <Field label="Property name">{(id) => <input id={id} className="input" required maxLength={120} placeholder="Sunrise Tower" value={values.name} onChange={set("name")} />}</Field>
        <Field label="Property type">
          {(id) => (
            <select id={id} className="select" value={values.propertyType} onChange={set("propertyType")}>
              {PROPERTY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          )}
        </Field>
      </div>
      <Field label="Description" hint="Shown on the listing. Up to 2,000 characters.">{(id) => <textarea id={id} className="textarea" maxLength={2000} value={values.description} onChange={set("description")} />}</Field>

      <div className="stack stack--sm">
        <h3>Address</h3>
        <div className="grid-2">
          <Field label="Street address">{(id) => <input id={id} className="input" required value={values.streetAddress} onChange={set("streetAddress")} />}</Field>
          <Field label="City">{(id) => <input id={id} className="input" required value={values.city} onChange={set("city")} />}</Field>
          <Field label="Province or state">{(id) => <input id={id} className="input" required value={values.province} onChange={set("province")} />}</Field>
          <Field label="Postal code (optional)">{(id) => <input id={id} className="input" value={values.postalCode} onChange={set("postalCode")} />}</Field>
          <Field label="Country">{(id) => <input id={id} className="input" required value={values.country} onChange={set("country")} />}</Field>
          <Field label="Near (optional)" hint="A landmark renters know, such as a metro station">{(id) => <input id={id} className="input" maxLength={120} value={values.landmark} onChange={set("landmark")} />}</Field>
        </div>
        <div className="stack stack--sm">
          <span className="label">Pin it on the map <span className="muted">(optional)</span></span>
          <LazyMapPicker
            value={values.latitude && values.longitude ? { latitude: Number(values.latitude), longitude: Number(values.longitude) } : null}
            center={cityCenter}
            onChange={(point) => setValues((current) => ({ ...current, latitude: point ? String(point.latitude) : "", longitude: point ? String(point.longitude) : "" }))}
          />
        </div>
      </div>

      <div className="stack stack--sm">
        <h3>The building</h3>
        <div className="grid-3">
          <Field label="Year built">{(id) => <input id={id} className="input" inputMode="numeric" value={values.yearBuilt} onChange={set("yearBuilt")} />}</Field>
          <Field label="Total floors">{(id) => <input id={id} className="input" inputMode="numeric" value={values.totalFloors} onChange={set("totalFloors")} />}</Field>
          <Field label="Parking slots">{(id) => <input id={id} className="input" inputMode="numeric" value={values.parkingSlots} onChange={set("parkingSlots")} />}</Field>
        </div>
        <CheckGroup label="Amenities" options={AMENITIES} value={values.amenities} onChange={(amenities) => setValues((current) => ({ ...current, amenities }))} />
      </div>

      <div><button type="submit" className="btn" disabled={busy || !valid}>{busy ? "Saving…" : submitLabel}</button></div>
    </form>
  );
}
