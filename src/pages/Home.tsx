import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { ListingCard } from "../components/ListingCard";
import { Empty, Spinner } from "../components/ui";
import { PROPERTY_TYPES, formatMoney } from "../lib/format";
import { FALLBACK_CURRENCY, priceSteps } from "../lib/currency";
import { usePageTitle } from "../lib/hooks";
import type { ListingCard as Card, Page, PublicFilters } from "../lib/types";

type ListingPage = Page<Card> & { currency: string };



function HeroSearch({ filters }: { filters?: PublicFilters }) {
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [budget, setBudget] = useState("");
  const currency = filters?.currency ?? FALLBACK_CURRENCY;
  const { budgets } = priceSteps(currency);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (type) params.set("propertyType", type);
    if (budget) params.set("maxRent", budget);
    navigate(`/homes${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <form className="herosearch" role="search" onSubmit={submit}>
      <div className="field">
        <label htmlFor="h-city">Where</label>
        <select id="h-city" className="select" value={city} onChange={(event) => setCity(event.target.value)}>
          <option value="">Anywhere in the Philippines</option>
          {filters?.cities.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="h-type">Property type</label>
        <select id="h-type" className="select" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">Any type</option>
          {PROPERTY_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="h-budget">Monthly budget</label>
        <select id="h-budget" className="select" value={budget} onChange={(event) => setBudget(event.target.value)}>
          <option value="">Any budget</option>
          {budgets.map((amount) => <option key={amount} value={amount}>Up to {formatMoney(amount, currency)}</option>)}
        </select>
      </div>
      <button type="submit" className="btn btn--lg">Search homes</button>
    </form>
  );
}

function Latest({ currency }: { currency: string }) {
  const tiers: { label: string; maxRent?: number }[] = [
    ...priceSteps(currency).tiers.map((amount) => ({ label: `Under ${formatMoney(amount, currency)}`, maxRent: amount })),
    { label: "All homes" },
  ];
  const [tier, setTier] = useState(tiers.length - 1);
  const maxRent = tiers[tier].maxRent;
  const list = useQuery({
    queryKey: ["public", "latest", maxRent],
    queryFn: () => api.get<ListingPage>("/public/listings", { sort: "newest", pageSize: 6, maxRent }),
    placeholderData: (previous) => previous,
  });

  return (
    <section className="section">
      <div className="container stack stack--lg">
        <div className="section__head">
          <div>
            <div className="eyebrow eyebrow--brass">Just listed</div>
            <h2>Latest homes</h2>
          </div>
          <Link className="link small" to={maxRent ? `/homes?maxRent=${maxRent}` : "/homes"}>See all homes →</Link>
        </div>
        <div className="tabs" role="tablist" aria-label="Price range">
          {tiers.map((item, index) => (
            <button key={index} type="button" role="tab" aria-selected={tier === index} onClick={() => setTier(index)}>{item.label}</button>
          ))}
        </div>
        {list.isLoading && <Spinner />}
        {list.data && list.data.items.length === 0 && (
          <Empty title="No homes in this range yet"><p>Try another range, or <Link className="link" to="/homes">see all homes</Link>.</p></Empty>
        )}
        {list.data && list.data.items.length > 0 && (
          <div className="cards">{list.data.items.map((item) => <ListingCard key={item.id} item={item} currency={list.data.currency} />)}</div>
        )}
      </div>
    </section>
  );
}

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export default function Home() {
  usePageTitle("");
  const filters = useQuery({ queryKey: ["public", "filters"], queryFn: () => api.get<PublicFilters>("/public/filters"), staleTime: 5 * 60_000 });
  const currency = filters.data?.currency ?? FALLBACK_CURRENCY;
  const popular = filters.data?.cityCounts.slice(0, 6) ?? [];

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div className="eyebrow hero__eyebrow">Homes to rent across the Philippines</div>
          <h1>Find a home you will love, without the hassle</h1>
          <p>Every listing is checked by our team. Prices are monthly and in {currency}, so you can compare at a glance.</p>
        </div>
        <svg className="hero__skyline" viewBox="0 0 1200 140" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <g fill="#f3efe3" opacity="0.07">
            <rect x="40" y="70" width="70" height="70" /><rect x="125" y="30" width="80" height="110" /><rect x="220" y="78" width="60" height="62" /><rect x="295" y="10" width="90" height="130" /><rect x="400" y="60" width="64" height="80" />
            <rect x="520" y="85" width="70" height="55" /><rect x="610" y="25" width="84" height="115" /><rect x="710" y="72" width="60" height="68" /><rect x="790" y="40" width="96" height="100" /><rect x="900" y="80" width="64" height="60" />
            <rect x="990" y="20" width="84" height="120" /><rect x="1090" y="68" width="70" height="72" />
          </g>
        </svg>
      </section>
      <div className="container"><HeroSearch filters={filters.data} /></div>

      {popular.length > 0 && (
        <section className="section section--tight">
          <div className="container stack">
            <div className="section__head">
              <div><div className="eyebrow eyebrow--brass">Popular areas</div><h2>Browse by city</h2></div>
              <Link className="link small" to="/homes">All areas →</Link>
            </div>
            <div className="tiles">
              {popular.map((row) => (
                <Link key={row.city} to={`/homes?city=${encodeURIComponent(row.city)}`} className="tile">
                  <span className="tile__name">{row.city}</span>
                  <span className="tile__count">{row.count} home{row.count === 1 ? "" : "s"}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Latest currency={currency} />

      <section className="section section--alt">
        <div className="container">
          <div className="values">
            <div className="value"><Icon><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M9 12l2 2 4-4" /></Icon><h3>Checked before it is listed</h3><p>Every owner is verified and every property is reviewed by our team before it appears.</p></div>
            <div className="value"><Icon><path d="M4 7h16M4 12h16M4 17h10" /></Icon><h3>Clear prices, clear details</h3><p>Monthly rent in {currency}, deposit, minimum stay and what is included, all on one page.</p></div>
            <div className="value"><Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></Icon><h3>One simple request</h3><p>Ask to rent in a minute. We pass your request on and keep you updated by email and in the app.</p></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="band">
            <div className="stack">
              <div className="eyebrow band__eyebrow">For owners</div>
              <h2>Have a home to rent out? List it in minutes.</h2>
              <p>Add the details, a few photos and your ownership papers. We review it and put it in front of people looking for a home.</p>
              <div className="row"><Link to="/list" className="btn btn--light btn--lg">List your property</Link></div>
            </div>
            <ol className="band__steps">
              <li><b>Describe your home</b><span>Address, rooms, rent and what is included.</span></li>
              <li><b>Add photos</b><span>At least three. The first is your cover.</span></li>
              <li><b>Verify and submit</b><span>Your ID and an ownership document. We review and let you know.</span></li>
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
