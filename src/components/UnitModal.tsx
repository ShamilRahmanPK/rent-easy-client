import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { useCurrency } from "../lib/currency";
import { FURNISHING, UNIT_FEATURES, UNIT_TYPES, UTILITIES } from "../lib/format";
import type { Unit } from "../lib/types";
import { useToast } from "./Toast";
import { Alert, CheckGroup, Field, Modal } from "./ui";
import { errorMessage } from "../api/client";

interface Values {
  unitNumber: string;
  floor: string;
  unitType: string;
  bedrooms: string;
  bathrooms: string;
  floorArea: string;
  furnishing: string;
  monthlyRent: string;
  securityDeposit: string;
  minLeaseMonths: string;
  noticePeriodMonths: string;
  utilities: string;
  availableFrom: string;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  features: string[];
  description: string;
}

const blank: Values = {
  unitNumber: "",
  floor: "",
  unitType: "one_bedroom",
  bedrooms: "1",
  bathrooms: "1",
  floorArea: "",
  furnishing: "Unfurnished",
  monthlyRent: "",
  securityDeposit: "",
  minLeaseMonths: "",
  noticePeriodMonths: "",
  utilities: "NotIncluded",
  availableFrom: "",
  petsAllowed: false,
  smokingAllowed: false,
  features: [],
  description: "",
};

const fromUnit = (unit: Unit): Values => ({
  unitNumber: unit.unitNumber,
  floor: unit.floor !== null ? String(unit.floor) : "",
  unitType: unit.unitType,
  bedrooms: String(unit.bedrooms),
  bathrooms: String(unit.bathrooms),
  floorArea: String(unit.floorArea),
  furnishing: unit.furnishing,
  monthlyRent: String(unit.monthlyRent),
  securityDeposit: unit.securityDeposit !== null ? String(unit.securityDeposit) : "",
  minLeaseMonths: unit.minLeaseMonths !== null ? String(unit.minLeaseMonths) : "",
  noticePeriodMonths: unit.noticePeriodMonths !== null ? String(unit.noticePeriodMonths) : "",
  utilities: unit.utilities,
  availableFrom: unit.availableFrom ?? "",
  petsAllowed: unit.petsAllowed,
  smokingAllowed: unit.smokingAllowed,
  features: unit.features,
  description: unit.description ?? "",
});

const num = (value: string) => (value.trim() === "" ? null : Number(value));

export function UnitModal({ propertyId, unit, onClose, onSaved }: { propertyId: string; unit?: Unit; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const currency = useCurrency();
  const [values, setValues] = useState<Values>(unit ? fromUnit(unit) : blank);
  const [error, setError] = useState("");
  const set = (key: keyof Values) => (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value }));

  const save = useMutation({
    mutationFn: () => {
      const body = {
        unitNumber: values.unitNumber.trim(),
        floor: num(values.floor),
        unitType: values.unitType,
        bedrooms: Number(values.bedrooms),
        bathrooms: Number(values.bathrooms),
        floorArea: Number(values.floorArea),
        furnishing: values.furnishing,
        monthlyRent: Number(values.monthlyRent),
        securityDeposit: num(values.securityDeposit),
        minLeaseMonths: num(values.minLeaseMonths),
        noticePeriodMonths: num(values.noticePeriodMonths),
        utilities: values.utilities,
        availableFrom: values.availableFrom || null,
        petsAllowed: values.petsAllowed,
        smokingAllowed: values.smokingAllowed,
        features: values.features,
        description: values.description.trim() || null,
      };
      return unit ? api.patch(`/units/${unit.id}`, body) : api.post(`/properties/${propertyId}/units`, body);
    },
    onSuccess: () => {
      toast.success(unit ? "Unit saved" : "Unit added");
      onSaved();
    },
    onError: (caught) => setError(errorMessage(caught)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    save.mutate();
  };

  const valid = values.unitNumber.trim() && values.floorArea && Number(values.floorArea) > 0 && values.monthlyRent && Number(values.monthlyRent) > 0 && values.bedrooms !== "" && values.bathrooms !== "";

  return (
    <Modal title={unit ? `Edit unit ${unit.unitNumber}` : "Add a unit"} onClose={onClose} wide>
      <form className="stack" onSubmit={submit}>
        {error && <Alert>{error}</Alert>}
        <div className="grid-3">
          <Field label="Unit number or name">{(id) => <input id={id} className="input" required maxLength={30} placeholder="12A" value={values.unitNumber} onChange={set("unitNumber")} />}</Field>
          <Field label="Unit type">
            {(id) => <select id={id} className="select" value={values.unitType} onChange={set("unitType")}>{UNIT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>}
          </Field>
          <Field label="Floor (optional)">{(id) => <input id={id} className="input" inputMode="numeric" value={values.floor} onChange={set("floor")} />}</Field>
          <Field label="Bedrooms" hint="0 for a studio">{(id) => <input id={id} className="input" type="number" min={0} max={20} step={1} required value={values.bedrooms} onChange={set("bedrooms")} />}</Field>
          <Field label="Bathrooms" hint="Steps of 0.5, for example 1.5">{(id) => <input id={id} className="input" type="number" min={0} max={20} step={0.5} required value={values.bathrooms} onChange={set("bathrooms")} />}</Field>
          <Field label="Floor area (m²)">{(id) => <input id={id} className="input" type="number" min={1} step="0.01" required value={values.floorArea} onChange={set("floorArea")} />}</Field>
          <Field label="Furnishing">
            {(id) => <select id={id} className="select" value={values.furnishing} onChange={set("furnishing")}>{FURNISHING.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
          </Field>
          <Field label={`Monthly rent (${currency})`}>{(id) => <input id={id} className="input" type="number" min={1} step="0.01" required value={values.monthlyRent} onChange={set("monthlyRent")} />}</Field>
          <Field label={`Security deposit (${currency})`}>{(id) => <input id={id} className="input" type="number" min={0} step="0.01" value={values.securityDeposit} onChange={set("securityDeposit")} />}</Field>
          <Field label="Minimum lease (months)">{(id) => <input id={id} className="input" type="number" min={1} max={120} value={values.minLeaseMonths} onChange={set("minLeaseMonths")} />}</Field>
          <Field label="Notice period (months)">{(id) => <input id={id} className="input" type="number" min={0} max={12} value={values.noticePeriodMonths} onChange={set("noticePeriodMonths")} />}</Field>
          <Field label="Utilities">
            {(id) => <select id={id} className="select" value={values.utilities} onChange={set("utilities")}>{UTILITIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
          </Field>
          <Field label="Available from">{(id) => <input id={id} className="input" type="date" value={values.availableFrom} onChange={set("availableFrom")} />}</Field>
        </div>
        <div className="row" style={{ gap: 24 }}>
          <label className="check"><input type="checkbox" checked={values.petsAllowed} onChange={(event) => setValues({ ...values, petsAllowed: event.target.checked })} /> Pets allowed</label>
          <label className="check"><input type="checkbox" checked={values.smokingAllowed} onChange={(event) => setValues({ ...values, smokingAllowed: event.target.checked })} /> Smoking allowed</label>
        </div>
        <CheckGroup label="Features" options={UNIT_FEATURES} value={values.features} onChange={(features) => setValues({ ...values, features })} />
        <Field label="Description (optional)">{(id) => <textarea id={id} className="textarea" maxLength={2000} value={values.description} onChange={set("description")} />}</Field>
        <div className="row row--end">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={save.isPending || !valid}>{save.isPending ? "Saving…" : unit ? "Save unit" : "Add unit"}</button>
        </div>
      </form>
    </Modal>
  );
}
