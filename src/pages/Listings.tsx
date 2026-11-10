import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { ListingCard } from "../components/ListingCard";
import { Alert, CheckGroup, Empty, Pagination, Spinner } from "../components/ui";
import { AMENITIES, FURNISHING, PROPERTY_TYPES } from "../lib/format";
import { FALLBACK_CURRENCY } from "../lib/currency";
import { useDebounced, usePageTitle } from "../lib/hooks";
import type { ListingCard as Card, Page, PublicFilters } from "../lib/types";

type ListingPage = Page<Card> & { currency: string };

export default function Listings() {
  usePageTitle("Residences to let");
  const [params, setParams] = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);

  const get = (key: string) => params.get(key) ?? "";
  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  };

  // Rent fields are typed, so wait for a pause before changing the address.
  const [minRent, setMinRent] = useState(get("minRent"));
  const [maxRent, setMaxRent] = useState(get("maxRent"));
  const debouncedMin = useDebounced(minRent);
  const debouncedMax = useDebounced(maxRent);
  useEffect(() => {
    if (debouncedMin !== get("minRent") || debouncedMax !== get("maxRent")) update({ minRent: debouncedMin, maxRent: debouncedMax });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin, debouncedMax]);

  const filters = useQuery({ queryKey: ["public", "filters"], queryFn: () => api.get<PublicFilters>("/public/filters"), staleTime: 5 * 60_000 });

  const query = {
    city: get("city"),
    minRent: get("minRent"),
    maxRent: get("maxRent"),
    bedrooms: get("bedrooms"),
    bathrooms: get("bathrooms"),
    propertyType: get("propertyType"),
    furnishing: get("furnishing"),
    amenities: get("amenities"),
    sort: get("sort") || "newest",
    page: Number(get("page")) || 1,
    pageSize: 12,
  };
  const listings = useQuery({ queryKey: ["public", "listings", query], queryFn: () => api.get<ListingPage>("/public/listings", query), placeholderData: (previous) => previous });

  const amenities = query.amenities ? query.amenities.split(",") : [];
  const extraCount = ["bathrooms", "furnishing", "amenities"].filter((key) => get(key)).length;
  const anyFilter = ["city", "minRent", "maxRent", "bedrooms", "bathrooms", "propertyType", "furnishing", "amenities"].some((key) => get(key));
  const currency = listings.data?.currency ?? FALLBACK_CURRENCY;

  return (
    <div className="container page">
      <div className="page__head" style={{ marginBottom: 14, borderBottom: 0, paddingBottom: 0 }}>
        <div>
          <div className="eyebrow eyebrow--brass">Residences to let</div>
          <h1>{query.city ? `Homes in ${query.city}` : "Find a home in the Philippines"}</h1>
        </div>
        <div className="row" style={{ gap: 14 }}>
          <span className="muted">{listings.data ? `${listings.data.total} home${listings.data.total === 1 ? "" : "s"}` : "Searching…"}</span>
          <div className="field" style={{ width: 170 }}>
            <label htmlFor="sort" className="sr-only">Sort by</label>
            <select id="sort" className="select" value={query.sort} onChange={(event) => update({ sort: event.target.value })}>
              <option value="newest">Newest first</option>
              <option value="price_asc">Rent: low to high</option>
              <option value="price_desc">Rent: high to low</option>
            </select>
          </div>
        </div>
      </div>

      <div role="search" className="toolbar">
        <div className="field">
          <label htmlFor="f-city">City</label>
          <select id="f-city" className="select" value={query.city} onChange={(event) => update({ city: event.target.value })}>
            <option value="">Any city</option>
            {filters.data?.cities.map((city) => <option key={city}>{city}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-min">Rent from ({currency})</label>
          <input id="f-min" className="input" inputMode="numeric" placeholder={filters.data?.rent.min ? String(filters.data.rent.min) : "Any"} value={minRent} onChange={(event) => setMinRent(event.target.value.replace(/[^\d.]/g, ""))} />
        </div>
        <div className="field">
          <label htmlFor="f-max">Rent up to ({currency})</label>
          <input id="f-max" className="input" inputMode="numeric" placeholder={filters.data?.rent.max ? String(filters.data.rent.max) : "Any"} value={maxRent} onChange={(event) => setMaxRent(event.target.value.replace(/[^\d.]/g, ""))} />
        </div>
        <div className="field">
          <label htmlFor="f-bed">Bedrooms</label>
          <select id="f-bed" className="select" value={query.bedrooms} onChange={(event) => update({ bedrooms: event.target.value })}>
            <option value="">Any</option>
            <option value="0">Studio and up</option>
            <option value="1">1 and more</option>
            <option value="2">2 and more</option>
            <option value="3">3 and more</option>
            <option value="4">4 and more</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-type">Property type</label>
          <select id="f-type" className="select" value={query.propertyType} onChange={(event) => update({ propertyType: event.target.value })}>
            <option value="">All types</option>
            {PROPERTY_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn--ghost" aria-expanded={moreOpen} onClick={() => setMoreOpen((value) => !value)} style={{ minHeight: 38 }}>
          {moreOpen ? "Fewer filters" : `More${extraCount ? ` (${extraCount})` : ""}`}
        </button>
      </div>
      {moreOpen && (
        <div className="morefilters">
          <div className="field">
            <label htmlFor="f-bath">Bathrooms</label>
            <select id="f-bath" className="select" value={query.bathrooms} onChange={(event) => update({ bathrooms: event.target.value })}>
              <option value="">Any</option>
              <option value="1">1 and more</option>
              <option value="2">2 and more</option>
              <option value="3">3 and more</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-furn">Furnishing</label>
            <select id="f-furn" className="select" value={query.furnishing} onChange={(event) => update({ furnishing: event.target.value })}>
              <option value="">Any</option>
              {FURNISHING.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <CheckGroup label="Building features" options={AMENITIES} value={amenities} onChange={(next) => update({ amenities: next.join(",") })} />
        </div>
      )}
      {anyFilter && (
        <p style={{ marginTop: 8 }}>
          <button type="button" className="link small" onClick={() => { setMinRent(""); setMaxRent(""); setParams({}, { replace: true }); }}>Clear all filters</button>
        </p>
      )}

      <section aria-live="polite" style={{ marginTop: 20 }}>
        {listings.isLoading && <Spinner />}
        {listings.isError && <Alert>We could not load the listings. Please try again in a moment.</Alert>}
        {listings.data && listings.data.items.length === 0 && (
          <Empty title="No homes match these filters">
            <p>Try a wider rent range or fewer filters.</p>
          </Empty>
        )}
        {listings.data && listings.data.items.length > 0 && (
          <div className="cards">
            {listings.data.items.map((item) => <ListingCard key={item.id} item={item} currency={currency} />)}
          </div>
        )}
        {listings.data && (
          <Pagination page={listings.data.page} totalPages={listings.data.totalPages} total={listings.data.total} onPage={(page) => { update({ page: String(page) }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        )}
      </section>
    </div>
  );
}
