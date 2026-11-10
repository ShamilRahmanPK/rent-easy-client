import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError, api, errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { LazyStaticMap } from "../components/MapLazy";
import { useToast } from "../components/Toast";
import { Alert, Empty, Field, Lightbox, Modal, Photo, Spinner } from "../components/ui";
import { AMENITIES, FURNISHING, PROPERTY_TYPES, UNIT_FEATURES, UNIT_TYPES, UTILITIES, formatDate, formatMoney, isReadyToMove, labelOf } from "../lib/format";
import { usePageTitle } from "../lib/hooks";
import type { ListingDetail as Detail } from "../lib/types";

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M8 12.5l2.7 2.7L16 9.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

function FactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fact"><span>{label}</span><b>{children}</b></div>
  );
}

export default function ListingDetail() {
  const { unitId = "" } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const toast = useToast();
  const [viewer, setViewer] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState<{ text: string; needsProfile: boolean } | null>(null);

  const query = useQuery({ queryKey: ["public", "listing", unitId], queryFn: () => api.get<Detail>(`/public/listings/${unitId}`), retry: false });
  usePageTitle(query.data ? `${query.data.property.name}, ${query.data.unit.unitNumber}` : "Home");

  const send = useMutation({
    mutationFn: () => api.post(`/units/${unitId}/rent-requests`, message.trim() ? { message: message.trim() } : {}),
    onSuccess: () => {
      setRequestOpen(false);
      setMessage("");
      toast.success("Request sent. We will be in touch once it is reviewed.");
    },
    onError: (error) => setProblem({ text: errorMessage(error), needsProfile: error instanceof ApiError && error.status === 422 }),
  });

  if (query.isLoading) return <Spinner />;
  if (query.isError || !query.data) {
    return (
      <div className="container page">
        <Empty title="This home is no longer available">
          <p>It may have been rented or taken off the market.</p>
          <p style={{ marginTop: 14 }}><Link className="btn" to="/homes">See other homes</Link></p>
        </Empty>
      </div>
    );
  }

  const { unit, property, gallery, currency } = query.data;
  const shown = gallery.slice(0, 5);
  const features = [...unit.features.map((value) => labelOf(UNIT_FEATURES, value)), ...property.amenities.map((value) => labelOf(AMENITIES, value))];
  const landmark = property.address.landmark?.replace(/^near\s+/i, "");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setProblem(null);
    send.mutate();
  };
  const openRequest = () => {
    setProblem(null);
    setRequestOpen(true);
  };

  return (
    <>
      <div className="container page" style={{ paddingBottom: 96 }}>
        <p className="small" style={{ marginBottom: 12 }}><Link className="link" to="/homes">← All homes</Link></p>

        {shown.length > 0 ? (
          <div className="gallery" style={shown.length === 1 ? { gridTemplateColumns: "1fr", gridTemplateRows: "360px" } : undefined}>
            {shown.map((file, index) => (
              <button key={file.id} type="button" onClick={() => setViewer(index)} aria-label={`Open photo ${index + 1}`}>
                <Photo file={file} alt={`${property.name}, photo ${index + 1}`} thumb={index > 0} />
              </button>
            ))}
          </div>
        ) : (
          <div className="photo-fallback" style={{ height: 260, borderRadius: 6 }}>No photos yet</div>
        )}
        {viewer !== null && <Lightbox images={gallery} index={viewer} onClose={() => setViewer(null)} />}

        <div className="stack stack--lg" style={{ marginTop: 24 }}>
          <div className="row row--between" style={{ alignItems: "flex-start", gap: 16 }}>
            <div className="stack stack--sm">
              <span className="eyebrow eyebrow--brass">{labelOf(UNIT_TYPES, unit.unitType)} · {labelOf(PROPERTY_TYPES, property.propertyType)}</span>
              <h1>{property.name}, {unit.unitNumber}</h1>
              <div className="row" style={{ gap: 8 }}>
                <span>{property.address.street}, {property.address.city}, {property.address.province}</span>
                {landmark && <span className="chip chip--outline">Near {landmark}</span>}
              </div>
            </div>
            <div className="price" style={{ textAlign: "right" }}>
              <b>{formatMoney(unit.monthlyRent, currency)}</b>
              <small>per month</small>
            </div>
          </div>

          <section className="stack">
            <h3>Details</h3>
            <div className="facts-grid">
              <FactRow label="Available">{isReadyToMove(unit.availableFrom) ? "Ready to move" : formatDate(unit.availableFrom)}</FactRow>
              <FactRow label="Bedrooms">{unit.bedrooms === 0 ? "Studio" : unit.bedrooms}</FactRow>
              <FactRow label="Bathrooms">{unit.bathrooms}</FactRow>
              <FactRow label="Utilities">{labelOf(UTILITIES, unit.utilities)}</FactRow>
              <FactRow label="Area">{unit.floorArea} m²</FactRow>
              <FactRow label="Furnishing">{labelOf(FURNISHING, unit.furnishing)}</FactRow>
              <FactRow label="Security deposit">{unit.securityDeposit !== null ? formatMoney(unit.securityDeposit, currency) : "Not specified"}</FactRow>
              <FactRow label="Minimum stay">{unit.minLeaseMonths ? `${unit.minLeaseMonths} months` : "Not specified"}</FactRow>
              <FactRow label="Notice period">{unit.noticePeriodMonths !== null ? `${unit.noticePeriodMonths} month${unit.noticePeriodMonths === 1 ? "" : "s"}` : "Not specified"}</FactRow>
              {unit.floor !== null && <FactRow label="Floor">{unit.floor}</FactRow>}
              <FactRow label="Pets">{unit.petsAllowed ? "Allowed" : "Not allowed"}</FactRow>
              <FactRow label="Smoking">{unit.smokingAllowed ? "Allowed" : "Not allowed"}</FactRow>
            </div>
          </section>

          {features.length > 0 && (
            <section className="stack">
              <h3>Amenities</h3>
              <ul className="checkgrid">{features.map((label) => <li key={label}><Check />{label}</li>)}</ul>
            </section>
          )}

          {(unit.description || property.description) && (
            <section className="stack stack--sm">
              <h3>Description</h3>
              {unit.description && <p className="prewrap">{unit.description}</p>}
              {property.description && <p className="prewrap muted">{property.description}</p>}
            </section>
          )}

          <section className="stack">
            <h3>Location and building</h3>
            <div className="facts-grid">
              {property.yearBuilt && <FactRow label="Built">{property.yearBuilt}</FactRow>}
              {property.totalFloors && <FactRow label="Floors">{property.totalFloors}</FactRow>}
              {property.parkingSlots !== null && <FactRow label="Parking slots">{property.parkingSlots}</FactRow>}
              <FactRow label="Address">{property.address.street}, {property.address.city}</FactRow>
            </div>
            {property.location && (
              <div className="stack stack--sm">
                <div className="row">
                  <button type="button" className="btn btn--ghost btn--sm" aria-expanded={showMap} onClick={() => setShowMap((value) => !value)}>
                    {showMap ? "Hide map" : "Show on map"}
                  </button>
                  {showMap && (
                    <a className="link small" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${property.location.latitude}&mlon=${property.location.longitude}#map=17/${property.location.latitude}/${property.location.longitude}`}>Open in OpenStreetMap ↗</a>
                  )}
                </div>
                {showMap && <LazyStaticMap location={property.location} />}
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="actionbar" role="region" aria-label="Request this home">
        <div className="container row row--between">
          <div>
            <b className="actionbar__price">{formatMoney(unit.monthlyRent, currency)}</b> <span className="muted">/ month</span>
            <div className="muted small hide-sm">An admin reviews every request and keeps you updated.</div>
          </div>
          {user ? (
            <button type="button" className="btn btn--lg" onClick={openRequest}>Request to rent</button>
          ) : (
            <Link className="btn btn--lg" to="/login" state={{ from: location.pathname }}>Sign in to request</Link>
          )}
        </div>
      </div>

      {requestOpen && (
        <Modal title="Request to rent" onClose={() => setRequestOpen(false)}>
          <form className="stack" onSubmit={submit}>
            <p className="muted">{property.name}, {unit.unitNumber} · {formatMoney(unit.monthlyRent, currency)} per month</p>
            {problem && (
              <Alert>
                {problem.text}
                {problem.needsProfile && <> <Link className="link" to="/account?tab=identity">Complete your profile</Link></>}
              </Alert>
            )}
            <Field label="Message (optional)" hint="Tell us when you would like to move in, or ask a question.">
              {(id) => <textarea id={id} className="textarea" maxLength={1000} value={message} onChange={(event) => setMessage(event.target.value)} />}
            </Field>
            <div className="row row--end">
              <button type="button" className="btn btn--ghost" onClick={() => setRequestOpen(false)}>Cancel</button>
              <button type="submit" className="btn" disabled={send.isPending}>{send.isPending ? "Sending…" : "Send request"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
