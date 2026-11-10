import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { DocumentsPanel, PhotosPanel } from "../components/FilesPanel";
import { PropertyFields, payloadFromValues, valuesFromProperty } from "../components/PropertyFields";
import { useToast } from "../components/Toast";
import { UnitModal } from "../components/UnitModal";
import { Alert, ConfirmModal, DescriptionList, Empty, Field, Modal, PageHeader, Spinner, StatusTag, Tabs } from "../components/ui";
import { AMENITIES, PROPERTY_TYPES, UNIT_TYPES, formatDate, formatMoney, labelOf } from "../lib/format";
import { useCurrency } from "../lib/currency";
import { usePageTitle } from "../lib/hooks";
import type { Property, Unit } from "../lib/types";

// The same screen serves the owner (their own property) and the admin (any property, with the review panel).
export default function PropertyManage({ admin = false }: { admin?: boolean }) {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const tab = params.get("tab") ?? "overview";
  const currency = useCurrency();

  const [unitModal, setUnitModal] = useState<{ unit?: Unit } | null>(null);
  const [photoUnit, setPhotoUnit] = useState<Unit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);

  const query = useQuery({ queryKey: ["property", id], queryFn: () => api.get<Property>(`/properties/${id}`), retry: false });
  const property = query.data;
  usePageTitle(property?.name ?? "Property");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["property", id] });
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  const save = useMutation({
    mutationFn: (values: ReturnType<typeof payloadFromValues>) => api.patch(`/properties/${id}`, values),
    onSuccess: () => {
      toast.success("Property saved");
      refresh();
    },
    onError: toast.error,
  });
  const submit = useMutation({
    mutationFn: () => api.post(`/properties/${id}/submit`),
    onSuccess: () => {
      toast.success("Submitted for review. We will notify you of the decision.");
      refresh();
    },
    onError: toast.error,
  });
  const review = useMutation({
    mutationFn: (body: { action: "approve" } | { action: "reject"; reason: string }) => api.post(`/properties/${id}/review`, body),
    onSuccess: (_data, body) => {
      toast.success(body.action === "approve" ? "Property approved and listed" : "Property rejected. The owner was told why.");
      setRejecting(false);
      setReason("");
      refresh();
    },
    onError: toast.error,
  });
  const listing = useMutation({
    mutationFn: (listingStatus: "Listed" | "Hidden") => api.patch(`/properties/${id}/listing`, { listingStatus }),
    onSuccess: () => {
      toast.success("Listing updated");
      refresh();
    },
    onError: toast.error,
  });
  const archive = useMutation({
    mutationFn: () => api.delete(`/properties/${id}`),
    onSuccess: () => {
      toast.success("Property archived");
      setConfirmArchive(false);
      refresh();
    },
    onError: (error) => {
      setConfirmArchive(false);
      toast.error(error);
    },
  });
  const unitStatus = useMutation({
    mutationFn: ({ unit, status }: { unit: Unit; status: "Vacant" | "UnderMaintenance" }) => api.patch(`/units/${unit.id}/status`, { status }),
    onSuccess: refresh,
    onError: toast.error,
  });
  const removeUnit = useMutation({
    mutationFn: (unit: Unit) => api.delete(`/units/${unit.id}`),
    onSuccess: () => {
      toast.success("Unit deleted");
      setDeleteUnit(null);
      refresh();
    },
    onError: (error) => {
      setDeleteUnit(null);
      toast.error(error);
    },
  });

  if (query.isLoading) return <Spinner />;
  if (query.isError || !property) {
    return (
      <div className="container page">
        <Empty title="Property not found"><p>It may have been removed, or it belongs to someone else.</p></Empty>
      </div>
    );
  }

  const isOwner = user?.id === property.ownerId;
  const notSubmitted = property.approvalStatus === "Pending" && !property.submittedAt;
  const inReview = property.approvalStatus === "Pending" && !!property.submittedAt;
  const photoCount = property.photos.length;
  const documentCount = property.documents?.length ?? 0;
  const identityDone = Boolean(user?.idType && user?.idNumber && user?.idDocumentFileId);
  const canSubmit = isOwner && (notSubmitted || property.approvalStatus === "Rejected");
  const ready = photoCount >= 3 && documentCount >= 1 && (!isOwner || identityDone) && (!isOwner || !!user?.emailVerified);
  const base = admin ? "/admin/properties" : "/owner/properties";
  const setTab = (next: string) => setParams({ tab: next }, { replace: true });

  const checklist: [boolean, string][] = [
    [true, "Property details are filled in"],
    [photoCount >= 3, `At least 3 photos (${photoCount} added)`],
    [documentCount >= 1, `An ownership document (${documentCount} added)`],
    ...(isOwner ? ([[!!user?.emailVerified, "Your email address is verified"], [identityDone, "Your ID details and ID document are on file"]] as [boolean, string][]) : []),
  ];

  return (
    <div className="container page">
      <p className="small" style={{ marginBottom: 12 }}><Link className="link" to={base}>← {admin ? "All properties" : "My properties"}</Link></p>
      <PageHeader
        eyebrow={`${property.code} · ${labelOf(PROPERTY_TYPES, property.propertyType)}`}
        title={property.name}
        subtitle={`${property.address.street}, ${property.address.city}`}
        actions={<><StatusTag value={property.approvalStatus} label={`Approval: ${property.approvalStatus}`} /><StatusTag value={property.listingStatus} label={`Listing: ${property.listingStatus}`} /></>}
      />

      <div className="stack stack--lg">
        <Tabs
          tabs={[
            { id: "overview", label: "Overview" },
            { id: "details", label: "Details" },
            { id: "photos", label: `Photos and documents` },
            { id: "units", label: `Units (${property.totalUnits})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "overview" && (
          <div className="review">
            <div className="stack stack--lg">
              {property.approvalStatus === "Rejected" && (
                <Alert>
                  <b>This property needs changes.</b>
                  <p className="prewrap" style={{ marginTop: 4 }}>{property.rejectionReason}</p>
                  {isOwner && <p className="small" style={{ marginTop: 6 }}>Update the details, photos or documents, then submit it again.</p>}
                </Alert>
              )}
              {inReview && !admin && <Alert kind="warn">Your property is waiting for review. We will notify you as soon as there is a decision.</Alert>}
              {property.approvalStatus === "Approved" && property.listingStatus === "Listed" && <Alert kind="ok">This property is approved and listed. Vacant units appear on the public site.</Alert>}
              {property.listingStatus === "Archived" && <Alert>This property is archived and not visible on the public site.</Alert>}

              <div className="panel stack">
                <h3>About this property</h3>
                {property.description && <p className="prewrap">{property.description}</p>}
                <DescriptionList
                  rows={[
                    ["Address", `${property.address.street}, ${property.address.city}, ${property.address.province}, ${property.address.country}`],
                    ["Year built", property.yearBuilt],
                    ["Floors", property.totalFloors],
                    ["Parking slots", property.parkingSlots],
                    ["Amenities", property.amenities.length ? property.amenities.map((item) => labelOf(AMENITIES, item)).join(", ") : "None listed"],
                    ["Submitted", formatDate(property.submittedAt)],
                    ["Reviewed", formatDate(property.reviewedAt)],
                    ...(admin && property.owner ? ([["Owner", <span key="o">{property.owner.fullName} · {property.owner.userId} · {property.owner.email}</span>]] as [string, React.ReactNode][]) : []),
                  ]}
                />
              </div>
            </div>

            <aside className="stack">
              {(notSubmitted || property.approvalStatus === "Rejected") && (
                <div className="panel stack">
                  <h3>{notSubmitted ? "Ready to submit?" : "Submit again"}</h3>
                  <ul className="checklist">
                    {checklist.map(([done, label]) => (
                      <li key={label}><span className={done ? "ok" : "no"} aria-hidden="true">{done ? "✓" : "✕"}</span><span>{label}</span></li>
                    ))}
                  </ul>
                  {canSubmit ? (
                    <>
                      <button type="button" className="btn" disabled={!ready || submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? "Submitting…" : "Submit for review"}</button>
                      {!ready && <p className="muted small">Complete every item above to submit. {!identityDone && <Link className="link" to="/account?tab=identity">Add ID details</Link>}</p>}
                    </>
                  ) : (
                    <p className="muted small">Only the owner can submit this property.</p>
                  )}
                </div>
              )}

              {admin && inReview && (
                <div className="panel stack">
                  <h3>Review this property</h3>
                  <ul className="checklist">
                    {checklist.filter((_, index) => index < 3).map(([done, label]) => (
                      <li key={label}><span className={done ? "ok" : "no"} aria-hidden="true">{done ? "✓" : "✕"}</span><span>{label}</span></li>
                    ))}
                  </ul>
                  <p className="muted small">Check the photos and the ownership document first (Photos and documents tab).</p>
                  <div className="row">
                    <button type="button" className="btn" disabled={review.isPending} onClick={() => review.mutate({ action: "approve" })}>Approve</button>
                    <button type="button" className="btn btn--ghost" disabled={review.isPending} onClick={() => setRejecting(true)}>Reject</button>
                  </div>
                </div>
              )}

              {property.approvalStatus === "Approved" && property.listingStatus !== "Archived" && (
                <div className="panel stack">
                  <h3>Public listing</h3>
                  <p className="muted small">Hidden properties stay approved but do not appear on the public site.</p>
                  {property.listingStatus === "Listed" ? (
                    <button type="button" className="btn btn--ghost" disabled={listing.isPending} onClick={() => listing.mutate("Hidden")}>Hide from the public site</button>
                  ) : (
                    <button type="button" className="btn" disabled={listing.isPending} onClick={() => listing.mutate("Listed")}>Show on the public site</button>
                  )}
                </div>
              )}

              {admin && property.listingStatus !== "Archived" && (
                <div className="panel stack">
                  <h3>Archive</h3>
                  <p className="muted small">Removes the property from the public site. The record and its history are kept.</p>
                  <button type="button" className="btn btn--danger" onClick={() => setConfirmArchive(true)}>Archive property</button>
                </div>
              )}
              {admin && property.listingStatus === "Archived" && (
                <div className="panel stack">
                  <h3>Restore</h3>
                  <button type="button" className="btn" disabled={listing.isPending} onClick={() => listing.mutate("Hidden")}>Restore as hidden</button>
                </div>
              )}
            </aside>
          </div>
        )}

        {tab === "details" && (
          <div className="panel" style={{ maxWidth: 860 }}>
            <PropertyFields key={property.createdAt + property.name} initial={valuesFromProperty(property)} busy={save.isPending} submitLabel="Save changes" onSubmit={(values) => save.mutate(payloadFromValues(values))} />
          </div>
        )}

        {tab === "photos" && (
          <div className="stack stack--lg">
            <section className="stack">
              <div><h3>Property photos</h3><p className="muted">Add 3 to 20 photos. The cover photo is shown first on listings.</p></div>
              <PhotosPanel photos={property.photos} uploadPath={`/properties/${id}/photos`} max={20} onChanged={refresh} />
            </section>
            <section className="stack">
              <div><h3>Ownership documents</h3><p className="muted">Private. Only you and our admins can open these files.</p></div>
              <DocumentsPanel documents={property.documents ?? []} uploadPath={`/properties/${id}/documents`} onChanged={refresh} />
            </section>
          </div>
        )}

        {tab === "units" && (
          <section className="stack">
            <div className="row row--between">
              <div><h3>Units</h3><p className="muted">The homes inside this property. Tenants rent units, so rent, rooms and photos live here.</p></div>
              {property.listingStatus !== "Archived" && <button type="button" className="btn" onClick={() => setUnitModal({})}>Add a unit</button>}
            </div>
            {(property.units?.length ?? 0) === 0 ? (
              <Empty title="No units yet"><p>Add the first unit with its rent and rooms so it can be rented.</p></Empty>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Unit</th><th>Rooms</th><th>Area</th><th>Rent</th><th>Status</th><th>Photos</th><th></th></tr></thead>
                  <tbody>
                    {property.units!.map((unit) => (
                      <tr key={unit.id}>
                        <td><span className="title">{unit.unitNumber}</span><br /><span className="muted small">{unit.code} · {labelOf(UNIT_TYPES, unit.unitType)}</span></td>
                        <td className="nowrap">{unit.bedrooms} bd · {unit.bathrooms} ba</td>
                        <td className="nowrap">{unit.floorArea} m²</td>
                        <td className="nowrap">{formatMoney(unit.monthlyRent, currency)}</td>
                        <td><StatusTag value={unit.status} /></td>
                        <td><button type="button" className="link small" onClick={() => setPhotoUnit(unit)}>{unit.photos.length} photo{unit.photos.length === 1 ? "" : "s"}</button></td>
                        <td className="right nowrap">
                          <span className="row row--end" style={{ gap: 14 }}>
                            <button type="button" className="link small" onClick={() => setUnitModal({ unit })}>Edit</button>
                            {unit.status !== "Occupied" && (
                              <button type="button" className="link small" disabled={unitStatus.isPending} onClick={() => unitStatus.mutate({ unit, status: unit.status === "Vacant" ? "UnderMaintenance" : "Vacant" })}>
                                {unit.status === "Vacant" ? "Set under maintenance" : "Set vacant"}
                              </button>
                            )}
                            <button type="button" className="link link--danger small" onClick={() => setDeleteUnit(unit)}>Delete</button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {unitModal && (
        <UnitModal propertyId={id} unit={unitModal.unit} onClose={() => setUnitModal(null)} onSaved={() => { setUnitModal(null); refresh(); }} />
      )}
      {photoUnit && (
        <Modal title={`Photos of unit ${photoUnit.unitNumber}`} onClose={() => setPhotoUnit(null)} wide>
          <PhotosPanel
            photos={property.units?.find((unit) => unit.id === photoUnit.id)?.photos ?? []}
            uploadPath={`/units/${photoUnit.id}/photos`}
            max={15}
            onChanged={refresh}
          />
        </Modal>
      )}
      {deleteUnit && (
        <ConfirmModal title="Delete this unit?" danger confirmLabel="Delete unit" busy={removeUnit.isPending} message={<p>Unit <b>{deleteUnit.unitNumber}</b> and its photos will be removed. This cannot be undone. A unit that has had a tenant cannot be deleted.</p>} onConfirm={() => removeUnit.mutate(deleteUnit)} onClose={() => setDeleteUnit(null)} />
      )}
      {confirmArchive && (
        <ConfirmModal title="Archive this property?" danger confirmLabel="Archive" busy={archive.isPending} message={<p>It will disappear from the public site. The owner is told. You can restore it later.</p>} onConfirm={() => archive.mutate()} onClose={() => setConfirmArchive(false)} />
      )}
      {rejecting && (
        <Modal title="Reject this property" onClose={() => setRejecting(false)}>
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              review.mutate({ action: "reject", reason: reason.trim() });
            }}
          >
            <Field label="Reason" hint="The owner receives this by email and in the app, so explain what to fix.">
              {(fieldId) => <textarea id={fieldId} className="textarea" required minLength={5} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />}
            </Field>
            {review.isError && <Alert>{errorMessage(review.error)}</Alert>}
            <div className="row row--end">
              <button type="button" className="btn btn--ghost" onClick={() => setRejecting(false)}>Cancel</button>
              <button type="submit" className="btn btn--danger" disabled={review.isPending || reason.trim().length < 5}>{review.isPending ? "Rejecting…" : "Reject property"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
