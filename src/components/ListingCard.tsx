import { useState } from "react";
import { Link } from "react-router-dom";
import { FURNISHING, formatDate, formatMoney, isReadyToMove, labelOf } from "../lib/format";
import type { ListingCard as Card } from "../lib/types";

// One home. The whole card opens the home; the arrows flip through its photos without leaving the page.
export function ListingCard({ item, currency }: { item: Card; currency: string }) {
  const [index, setIndex] = useState(0);
  const photos = item.photos.length > 0 ? item.photos : item.coverPhoto ? [item.coverPhoto] : [];
  const current = photos[index];
  const step = (direction: 1 | -1) => setIndex((value) => (value + direction + photos.length) % photos.length);

  const chips: string[] = [];
  chips.push(isReadyToMove(item.availableFrom) ? "Ready to move" : `From ${formatDate(item.availableFrom)}`);
  if (item.utilities === "AllIncluded") chips.push("Utilities included");
  else if (item.utilities === "Partly") chips.push("Some utilities included");
  if (item.furnishing !== "Unfurnished") chips.push(labelOf(FURNISHING, item.furnishing));
  if (item.petsAllowed) chips.push("Pets allowed");

  return (
    <article className="card">
      <div className="card__photo">
        {current?.thumbUrl || current?.url ? <img src={current.thumbUrl ?? current.url ?? ""} alt={`${item.property.name}, unit ${item.unitNumber}`} loading="lazy" /> : <div className="photo-fallback">No photo</div>}
        {photos.length > 1 && (
          <>
            <button type="button" className="card__nav card__nav--prev" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>
            <button type="button" className="card__nav card__nav--next" aria-label="Next photo" onClick={() => step(1)}>›</button>
            <span className="card__count">{index + 1} / {photos.length}</span>
          </>
        )}
      </div>
      <div className="card__body">
        <h3 className="card__title"><Link to={`/residences/${item.id}`}>{item.property.name}, {item.unitNumber}</Link></h3>
        <div className="card__loc">
          {item.property.city}{item.property.landmark ? ` · Near ${item.property.landmark.replace(/^near\s+/i, "")}` : ""}
        </div>
        <div className="card__facts">
          {item.bedrooms === 0 ? "Studio" : `${item.bedrooms} bd`} · {item.bathrooms} ba · {item.floorArea} m²
        </div>
        <div className="card__chips">{chips.slice(0, 3).map((chip) => <span key={chip} className="chip">{chip}</span>)}</div>
        <div className="card__price">
          <span><b>{formatMoney(item.monthlyRent, currency)}</b> / month</span>
          <span className="card__more" aria-hidden="true">Details →</span>
        </div>
      </div>
    </article>
  );
}
