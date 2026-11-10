import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { DocumentsPanel, PhotosPanel } from "../../components/FilesPanel";
import { useToast } from "../../components/Toast";
import { Alert, CheckGroup, Empty, Field, FileDrop, PageHeader, Spinner } from "../../components/ui";
import { AMENITIES, FURNISHING, UNIT_FEATURES, UTILITIES, formatMoney, idTypeOptions, labelOf } from "../../lib/format";
import { COUNTRY, PLACE_GROUPS, findPlace } from "../../lib/places";
import { LazyMapPicker } from "../../components/MapLazy";
import { useCurrency } from "../../lib/currency";
import { usePageTitle } from "../../lib/hooks";
import type { Property } from "../../lib/types";

const OTHER_CITY = "__other";
const KINDS = [
  { value: "apartment", label: "Apartment or flat", propertyType: "apartment_building" },
  { value: "villa", label: "Villa or house", propertyType: "house" },
  { value: "townhouse", label: "Townhouse", propertyType: "townhouse" },
  { value: "room", label: "A room in a shared home", propertyType: "apartment_building" },
];
const STEPS = ["About your home", "Photos", "Verification", "Review and submit"];
const STEP_TITLES = ["Tell us about your home", "Show it off with photos", "Verify who you are", "Review and submit"];

interface Form {
  kind: string;
  name: string;
  city: string;
  otherCity: string;
  province: string;
  street: string;
  landmark: string;
  latitude: string;
  longitude: string;
  unitNumber: string;
  bedrooms: string;
  bathrooms: string;
  floorArea: string;
  furnishing: string;
  description: string;
  monthlyRent: string;
  securityDeposit: string;
  availableFrom: string;
  minLeaseMonths: string;
  noticePeriodMonths: string;
  utilities: string;
  features: string[];
  amenities: string[];
  petsAllowed: boolean;
  smokingAllowed: boolean;
  yearBuilt: string;
  totalFloors: string;
  parkingSlots: string;
}

const blank: Form = {
  kind: "apartment", name: "", city: "Makati", otherCity: "", province: "", street: "", landmark: "", latitude: "", longitude: "", unitNumber: "1", bedrooms: "1", bathrooms: "1", floorArea: "", furnishing: "Unfurnished", description: "",
  monthlyRent: "", securityDeposit: "", availableFrom: "", minLeaseMonths: "", noticePeriodMonths: "", utilities: "NotIncluded", features: [], amenities: [],
  petsAllowed: false, smokingAllowed: false, yearBuilt: "", totalFloors: "", parkingSlots: "",
};

function unitTypeFor(kind: string, bedrooms: number) {
  if (kind === "room") return "room";
  if (kind === "villa" || kind === "townhouse") return "house";
  return bedrooms === 0 ? "studio" : bedrooms === 1 ? "one_bedroom" : bedrooms === 2 ? "two_bedroom" : "three_bedroom";
}

function formFrom(property: Property): Form {
  const unit = property.units?.[0];
  const kind = unit?.unitType === "room" ? "room" : property.propertyType === "house" ? "villa" : property.propertyType === "townhouse" ? "townhouse" : "apartment";
  return {
    kind, name: property.name, city: findPlace(property.address.city) ? property.address.city : OTHER_CITY, otherCity: findPlace(property.address.city) ? "" : property.address.city,
    province: property.address.province, street: property.address.street, landmark: property.address.landmark ?? "",
    latitude: property.location ? String(property.location.latitude) : "", longitude: property.location ? String(property.location.longitude) : "",
    unitNumber: unit?.unitNumber ?? "1", bedrooms: String(unit?.bedrooms ?? 1), bathrooms: String(unit?.bathrooms ?? 1), floorArea: unit ? String(unit.floorArea) : "",
    furnishing: unit?.furnishing ?? "Unfurnished", description: property.description ?? "", monthlyRent: unit ? String(unit.monthlyRent) : "",
    securityDeposit: unit?.securityDeposit != null ? String(unit.securityDeposit) : "", availableFrom: unit?.availableFrom ?? "",
    minLeaseMonths: unit?.minLeaseMonths != null ? String(unit.minLeaseMonths) : "", noticePeriodMonths: unit?.noticePeriodMonths != null ? String(unit.noticePeriodMonths) : "",
    utilities: unit?.utilities ?? "NotIncluded", features: unit?.features ?? [], amenities: property.amenities, petsAllowed: unit?.petsAllowed ?? false,
    smokingAllowed: unit?.smokingAllowed ?? false, yearBuilt: property.yearBuilt ? String(property.yearBuilt) : "", totalFloors: property.totalFloors ? String(property.totalFloors) : "",
    parkingSlots: property.parkingSlots != null ? String(property.parkingSlots) : "",
  };
}

const num = (value: string) => (value.trim() === "" ? null : Number(value));

function buildPayloads(form: Form) {
  const kind = KINDS.find((item) => item.value === form.kind) ?? KINDS[0];
  const bedrooms = form.kind === "room" ? 1 : Number(form.bedrooms);
  const property = {
    name: form.name.trim(),
    propertyType: kind.propertyType,
    description: form.description.trim() || null,
    streetAddress: form.street.trim(),
    city: form.city === OTHER_CITY ? form.otherCity.trim() : form.city,
    province: form.city === OTHER_CITY ? form.province.trim() : findPlace(form.city)?.province ?? form.city,
    country: COUNTRY,
    landmark: form.landmark.trim() || null,
    latitude: num(form.latitude),
    longitude: num(form.longitude),
    yearBuilt: num(form.yearBuilt),
    totalFloors: num(form.totalFloors),
    parkingSlots: num(form.parkingSlots),
    amenities: form.amenities,
  };
  const unit = {
    unitNumber: form.unitNumber.trim() || "1",
    unitType: unitTypeFor(form.kind, bedrooms),
    bedrooms,
    bathrooms: Number(form.bathrooms),
    floorArea: Number(form.floorArea),
    furnishing: form.furnishing,
    monthlyRent: Number(form.monthlyRent),
    securityDeposit: num(form.securityDeposit),
    minLeaseMonths: num(form.minLeaseMonths),
    noticePeriodMonths: num(form.noticePeriodMonths),
    utilities: form.utilities,
    availableFrom: form.availableFrom || null,
    petsAllowed: form.petsAllowed,
    smokingAllowed: form.smokingAllowed,
    features: form.features,
  };
  return { property, unit };
}

function Stepper({ step, reach, onGo }: { step: number; reach: number; onGo: (step: number) => void }) {
  return (
    <ol className="steps" aria-label="Progress">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const state = number === step ? "current" : number < step ? "done" : "todo";
        return (
          <li key={label} className={`steps__item steps__item--${state}`} aria-current={state === "current" ? "step" : undefined}>
            <button type="button" disabled={number > reach} onClick={() => onGo(number)}>
              <span className="steps__dot">{state === "done" ? "✓" : number}</span>
              <span className="steps__label">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function ListWizard() {
  usePageTitle("List your property");
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user, refresh: refreshUser } = useAuth();
  const currency = useCurrency();

  const step = Math.min(4, Math.max(1, Number(params.get("step")) || 1));
  const [form, setForm] = useState<Form>(blank);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [idType, setIdType] = useState(user?.idType ?? "");
  const [idNumber, setIdNumber] = useState(user?.idNumber ?? "");

  const query = useQuery({ queryKey: ["property", id], queryFn: () => api.get<Property>(`/properties/${id}`), enabled: !!id, retry: false });
  const property = query.data;

  // Fill the form once from the saved draft, so going back never loses what was typed.
  useEffect(() => {
    if (property && loadedFor !== property.id) {
      setForm(formFrom(property));
      setLoadedFor(property.id);
    }
  }, [property, loadedFor]);
  useEffect(() => {
    setIdType(user?.idType ?? "");
    setIdNumber(user?.idNumber ?? "");
  }, [user?.idType, user?.idNumber]);

  const go = (next: number, replaceId?: string) => navigate(`/list/${replaceId ?? id ?? ""}?step=${next}`.replace("/list/?", "/list?"), { replace: true });
  const refreshProperty = () => queryClient.invalidateQueries({ queryKey: ["property", id] });
  const set = (key: keyof Form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = useMutation({
    mutationFn: async () => {
      const { property: p, unit } = buildPayloads(form);
      if (!id) return api.post<Property>("/properties", { ...p, unit });
      await api.patch(`/properties/${id}`, p);
      const first = property?.units?.[0];
      if (first) await api.patch(`/units/${first.id}`, unit);
      else await api.post(`/properties/${id}/units`, unit);
      return { id } as Property;
    },
    onSuccess: (saved) => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["property", saved.id] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      toast.success("Saved. You can come back to this draft any time.");
      go(2, saved.id);
    },
    onError: (caught) => setError(errorMessage(caught)),
  });

  const saveId = useMutation({
    mutationFn: () => api.patch("/users/me", { idType: idType || null, idNumber: idNumber.trim() || null }),
    onSuccess: async () => {
      await refreshUser();
      toast.success("ID details saved");
    },
    onError: toast.error,
  });
  const uploadId = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("document", file);
      return api.post("/users/me/id-document", body);
    },
    onSuccess: async () => {
      await refreshUser();
      toast.success("ID document uploaded");
    },
    onError: toast.error,
  });
  const resend = useMutation({ mutationFn: () => api.post("/auth/resend-verification"), onSuccess: () => toast.success("Verification email sent. Check your inbox."), onError: toast.error });
  const submit = useMutation({
    mutationFn: () => api.post(`/properties/${id}/submit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      refreshProperty();
      setDone(true);
    },
    onError: (caught) => setError(errorMessage(caught)),
  });

  if (id && query.isLoading) return <Spinner />;
  if (id && (query.isError || !property)) return <div className="container page"><Empty title="We could not find this listing"><p>It may belong to someone else.</p><p style={{ marginTop: 14 }}><Link className="btn" to="/owner/properties">My properties</Link></p></Empty></div>;
  if (property && user && property.ownerId !== user.id) return <div className="container page"><Empty title="This listing belongs to someone else" /></div>;

  const photoCount = property?.photos.length ?? 0;
  const docCount = property?.documents?.length ?? 0;
  const idDone = Boolean(user?.idType && user?.idNumber && user?.idDocumentFileId);
  const verified = Boolean(user?.emailVerified);
  const submitted = !!property?.submittedAt && property.approvalStatus !== "Rejected";
  const chosenPlace = form.city === OTHER_CITY ? undefined : findPlace(form.city);
  const cityCenter = chosenPlace ? { latitude: chosenPlace.latitude, longitude: chosenPlace.longitude } : undefined;
  const cityValid = form.city === OTHER_CITY ? form.otherCity.trim() && form.province.trim() : form.city;
  const step1Valid = form.name.trim() && form.street.trim() && cityValid && Number(form.floorArea) > 0 && Number(form.monthlyRent) > 0 && form.bathrooms !== "";
  const reach = !id ? 1 : photoCount >= 3 ? (verified && idDone && docCount >= 1 ? 4 : 3) : 2;

  if (done || submitted) {
    return (
      <div className="container page">
        <div className="authcard stack stack--lg" style={{ textAlign: "center", width: "min(520px,100%)" }}>
          <div className="success__mark" aria-hidden="true">✓</div>
          <div>
            <h1>{done ? "Your listing is submitted" : "Your listing is in review"}</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              {property?.approvalStatus === "Approved" ? "It is approved and live." : "Our team will review it and let you know by email and in the app. This usually takes a short while."}
            </p>
          </div>
          <div className="row" style={{ justifyContent: "center" }}>
            <Link className="btn" to="/owner/properties">See my properties</Link>
            <Link className="btn btn--ghost" to="/list" onClick={() => setDone(false)}>List another</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 880 }}>
      <PageHeader eyebrow="List your property" title={property?.approvalStatus === "Rejected" && step === 1 ? "Update your listing" : STEP_TITLES[step - 1]} subtitle="Four short steps. Your progress is saved as a draft." />
      {property?.approvalStatus === "Rejected" && <div style={{ marginBottom: 16 }}><Alert><b>It needs a few changes.</b> {property.rejectionReason}</Alert></div>}
      <div className="stack stack--lg">
        <Stepper step={step} reach={reach} onGo={(next) => go(next)} />
        {error && <Alert>{error}</Alert>}

        {step === 1 && (
          <form className="stack stack--lg" onSubmit={(event) => { event.preventDefault(); setError(""); save.mutate(); }}>
            <section className="panel stack">
              <h3>Where is it?</h3>
              <div className="grid-2">
                <Field label="What are you listing?">
                  {(fid) => <select id={fid} className="select" value={form.kind} onChange={set("kind")}>{KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select>}
                </Field>
                <Field label="Building or community name" hint="For example Sunrise Tower">
                  {(fid) => <input id={fid} className="input" required maxLength={120} value={form.name} onChange={set("name")} />}
                </Field>
                <Field label="City" hint={form.city !== OTHER_CITY ? `Province or region: ${findPlace(form.city)?.province ?? ""}` : undefined}>
                  {(fid) => (
                    <select id={fid} className="select" value={form.city} onChange={set("city")}>
                      {PLACE_GROUPS.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.places.map((place) => <option key={place.city}>{place.city}</option>)}
                        </optgroup>
                      ))}
                      <option value={OTHER_CITY}>Other city or town…</option>
                    </select>
                  )}
                </Field>
                {form.city === OTHER_CITY && (
                  <>
                    <Field label="City or town">{(fid) => <input id={fid} className="input" required value={form.otherCity} onChange={set("otherCity")} />}</Field>
                    <Field label="Province">{(fid) => <input id={fid} className="input" required value={form.province} onChange={set("province")} />}</Field>
                  </>
                )}
                <Field label="Barangay and street">
                  {(fid) => <input id={fid} className="input" required placeholder="Brgy. Bel-Air, Jupiter Street" value={form.street} onChange={set("street")} />}
                </Field>
                <Field label="Near (optional)" hint="A landmark renters know, such as a metro station">
                  {(fid) => <input id={fid} className="input" maxLength={120} placeholder="MRT station or mall" value={form.landmark} onChange={set("landmark")} />}
                </Field>
                {form.kind === "apartment" || form.kind === "room" ? (
                  <Field label="Flat or unit number">{(fid) => <input id={fid} className="input" maxLength={30} placeholder="12A" value={form.unitNumber} onChange={set("unitNumber")} />}</Field>
                ) : null}
              </div>
              <div className="stack stack--sm">
                <span className="label">Pin the spot on the map <span className="muted">(optional, but renters love it)</span></span>
                <LazyMapPicker
                  value={form.latitude && form.longitude ? { latitude: Number(form.latitude), longitude: Number(form.longitude) } : null}
                  center={cityCenter}
                  onChange={(point) => setForm((current) => ({ ...current, latitude: point ? String(point.latitude) : "", longitude: point ? String(point.longitude) : "" }))}
                />
              </div>
            </section>

            <section className="panel stack">
              <h3>The home</h3>
              <div className="grid-3">
                {form.kind !== "room" && (
                  <Field label="Bedrooms">
                    {(fid) => <select id={fid} className="select" value={form.bedrooms} onChange={set("bedrooms")}>{[0, 1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count === 0 ? "Studio" : count}</option>)}</select>}
                  </Field>
                )}
                <Field label="Bathrooms">
                  {(fid) => <select id={fid} className="select" value={form.bathrooms} onChange={set("bathrooms")}>{[1, 1.5, 2, 2.5, 3, 3.5, 4, 5].map((count) => <option key={count} value={count}>{count}</option>)}</select>}
                </Field>
                <Field label="Size (m²)">{(fid) => <input id={fid} className="input" type="number" min={1} step="0.01" required value={form.floorArea} onChange={set("floorArea")} />}</Field>
                <Field label="Furnishing">
                  {(fid) => <select id={fid} className="select" value={form.furnishing} onChange={set("furnishing")}>{FURNISHING.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
                </Field>
              </div>
              <Field label="Describe it" hint="What makes this home a good place to live? Views, light, nearby shops and transport.">
                {(fid) => <textarea id={fid} className="textarea" maxLength={2000} value={form.description} onChange={set("description")} />}
              </Field>
            </section>

            <section className="panel stack">
              <h3>Rent and terms</h3>
              <div className="grid-3">
                <Field label={`Monthly rent (${currency})`}>{(fid) => <input id={fid} className="input" type="number" min={1} step="0.01" required value={form.monthlyRent} onChange={set("monthlyRent")} />}</Field>
                <Field label={`Security deposit (${currency})`}>{(fid) => <input id={fid} className="input" type="number" min={0} step="0.01" value={form.securityDeposit} onChange={set("securityDeposit")} />}</Field>
                <Field label="Available from" hint="Leave empty if ready to move in">{(fid) => <input id={fid} className="input" type="date" value={form.availableFrom} onChange={set("availableFrom")} />}</Field>
                <Field label="Utilities">
                  {(fid) => <select id={fid} className="select" value={form.utilities} onChange={set("utilities")}>{UTILITIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>}
                </Field>
                <Field label="Minimum stay (months)">{(fid) => <input id={fid} className="input" type="number" min={1} max={120} value={form.minLeaseMonths} onChange={set("minLeaseMonths")} />}</Field>
                <Field label="Notice period (months)">{(fid) => <input id={fid} className="input" type="number" min={0} max={12} value={form.noticePeriodMonths} onChange={set("noticePeriodMonths")} />}</Field>
              </div>
            </section>

            <section className="panel stack">
              <div className="row row--between">
                <h3>More details <span className="muted small">(optional)</span></h3>
                <button type="button" className="link small" aria-expanded={more} onClick={() => setMore((value) => !value)}>{more ? "Hide" : "Add amenities and more"}</button>
              </div>
              {more && (
                <div className="stack">
                  <CheckGroup label="Inside the home" options={UNIT_FEATURES} value={form.features} onChange={(features) => setForm({ ...form, features })} />
                  <CheckGroup label="Building amenities" options={AMENITIES} value={form.amenities} onChange={(amenities) => setForm({ ...form, amenities })} />
                  <div className="row" style={{ gap: 24 }}>
                    <label className="check"><input type="checkbox" checked={form.petsAllowed} onChange={(event) => setForm({ ...form, petsAllowed: event.target.checked })} /> Pets allowed</label>
                    <label className="check"><input type="checkbox" checked={form.smokingAllowed} onChange={(event) => setForm({ ...form, smokingAllowed: event.target.checked })} /> Smoking allowed</label>
                  </div>
                  <div className="grid-3">
                    <Field label="Year built">{(fid) => <input id={fid} className="input" inputMode="numeric" value={form.yearBuilt} onChange={set("yearBuilt")} />}</Field>
                    <Field label="Floors in the building">{(fid) => <input id={fid} className="input" inputMode="numeric" value={form.totalFloors} onChange={set("totalFloors")} />}</Field>
                    <Field label="Parking slots">{(fid) => <input id={fid} className="input" inputMode="numeric" value={form.parkingSlots} onChange={set("parkingSlots")} />}</Field>
                  </div>
                </div>
              )}
            </section>

            <div className="row row--between">
              <Link className="link small" to="/owner/properties">Cancel</Link>
              <button type="submit" className="btn btn--lg" disabled={save.isPending || !step1Valid}>{save.isPending ? "Saving…" : "Save and continue"}</button>
            </div>
          </form>
        )}

        {step === 2 && id && property && (
          <div className="stack stack--lg">
            <section className="panel stack">
              <div><h3>Add photos</h3><p className="muted">Add at least 3 clear photos. The first one is your cover photo, so start with the best.</p></div>
              <PhotosPanel photos={property.photos} uploadPath={`/properties/${id}/photos`} max={20} onChanged={refreshProperty} />
            </section>
            <div className="row row--between">
              <button type="button" className="btn btn--ghost" onClick={() => go(1)}>Back</button>
              <span className="row">
                {photoCount < 3 && <span className="muted small">{3 - photoCount} more photo{3 - photoCount === 1 ? "" : "s"} needed</span>}
                <button type="button" className="btn btn--lg" disabled={photoCount < 3} onClick={() => go(3)}>Continue</button>
              </span>
            </div>
          </div>
        )}

        {step === 3 && id && property && (
          <div className="stack stack--lg">
            <section className="panel stack">
              <div><h3>Verify your email</h3><p className="muted">We send updates about your listing to your email.</p></div>
              {verified ? <Alert kind="ok">Your email address is verified.</Alert> : (
                <Alert kind="warn">
                  <div className="row row--between">
                    <span>Check your inbox for the verification link.</span>
                    <span className="row"><button type="button" className="link small" disabled={resend.isPending} onClick={() => resend.mutate()}>Resend email</button><button type="button" className="link small" onClick={() => refreshUser()}>I have verified</button></span>
                  </div>
                </Alert>
              )}
            </section>
            <section className="panel stack">
              <div><h3>Your identity</h3><p className="muted">We verify every owner. Only you and our admins can see this.</p></div>
              <div className="grid-2">
                <Field label="ID type">{(fid) => <select id={fid} className="select" value={idType} onChange={(event) => setIdType(event.target.value)}><option value="">Select…</option>{idTypeOptions(user?.idType).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>}</Field>
                <Field label="ID number">{(fid) => <input id={fid} className="input" value={idNumber} onChange={(event) => setIdNumber(event.target.value)} />}</Field>
              </div>
              <div><button type="button" className="btn btn--ghost btn--sm" disabled={saveId.isPending || !idType || idNumber.trim().length < 3} onClick={() => saveId.mutate()}>{saveId.isPending ? "Saving…" : "Save ID details"}</button></div>
              <FileDrop accept="application/pdf,image/jpeg,image/png" busy={uploadId.isPending} label={user?.idDocumentFileId ? "ID document on file. Click to replace it." : "Upload a copy of your ID (PDF, JPG or PNG, up to 10 MB)"} onFiles={(files) => uploadId.mutate(files[0])} />
            </section>
            <section className="panel stack">
              <div><h3>Proof of ownership</h3><p className="muted">Upload your title deed or a tenancy contract that lets you rent the home out. Private to you and our admins.</p></div>
              <DocumentsPanel documents={property.documents ?? []} uploadPath={`/properties/${id}/documents`} onChanged={refreshProperty} />
            </section>
            <div className="row row--between">
              <button type="button" className="btn btn--ghost" onClick={() => go(2)}>Back</button>
              <span className="row">
                {!(verified && idDone && docCount >= 1) && <span className="muted small">Complete the three items above to continue</span>}
                <button type="button" className="btn btn--lg" disabled={!(verified && idDone && docCount >= 1)} onClick={() => go(4)}>Continue</button>
              </span>
            </div>
          </div>
        )}

        {step === 4 && id && property && (
          <div className="stack stack--lg">
            <section className="panel">
              <div className="reviewcard">
                <div className="reviewcard__photo">{property.photos[0]?.thumbUrl ? <img src={property.photos[0].thumbUrl} alt="" /> : <div className="photo-fallback">No photo</div>}</div>
                <div className="stack stack--sm">
                  <span className="eyebrow eyebrow--brass">{property.address.city}{property.address.landmark ? ` · Near ${property.address.landmark.replace(/^near\s+/i, "")}` : ""}</span>
                  <h3>{property.name}{property.units?.[0] ? `, ${property.units[0].unitNumber}` : ""}</h3>
                  {property.units?.[0] && (
                    <>
                      <p className="muted">{property.units[0].bedrooms === 0 ? "Studio" : `${property.units[0].bedrooms} bd`} · {property.units[0].bathrooms} ba · {property.units[0].floorArea} m² · {labelOf(FURNISHING, property.units[0].furnishing)}</p>
                      <p className="price" style={{ textAlign: "left" }}><b>{formatMoney(property.units[0].monthlyRent, currency)}</b> <small>per month</small></p>
                    </>
                  )}
                  <button type="button" className="link small" style={{ alignSelf: "flex-start" }} onClick={() => go(1)}>Edit details</button>
                </div>
              </div>
            </section>
            <section className="panel stack">
              <h3>Before you submit</h3>
              <ul className="checklist">
                {[
                  [!!property.units?.[0], "Home details and rent"],
                  [photoCount >= 3, `${photoCount} photos`],
                  [verified, "Email verified"],
                  [idDone, "ID details and ID document"],
                  [docCount >= 1, "Proof of ownership"],
                ].map(([ok, label]) => (
                  <li key={String(label)}><span className={ok ? "ok" : "no"} aria-hidden="true">{ok ? "✓" : "✕"}</span><span>{String(label)}</span></li>
                ))}
              </ul>
              <p className="muted small">Our team reviews every listing. We will email you and notify you in the app as soon as there is a decision.</p>
            </section>
            <div className="row row--between">
              <button type="button" className="btn btn--ghost" onClick={() => go(3)}>Back</button>
              <button type="button" className="btn btn--lg" disabled={submit.isPending || photoCount < 3 || !verified || !idDone || docCount < 1 || !property.units?.[0]} onClick={() => { setError(""); submit.mutate(); }}>{submit.isPending ? "Submitting…" : "Submit for review"}</button>
            </div>
          </div>
        )}
        {(step > 1 && !id) && <Alert>Start with your home details first.</Alert>}
      </div>
    </div>
  );
}
