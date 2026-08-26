"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/FormControls";

export default function SearchFilters({
  counties,
  towns,
  propertyTypes,
}: {
  counties: string[];
  towns: string[];
  propertyTypes: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [town, setTown] = useState(params.get("town") ?? "");
  const [county, setCounty] = useState(params.get("county") ?? "");
  const [type, setType] = useState(params.get("type") ?? "");
  const [minRent, setMinRent] = useState(params.get("minRent") ?? "");
  const [maxRent, setMaxRent] = useState(params.get("maxRent") ?? "");
  const [bedrooms, setBedrooms] = useState(params.get("bedrooms") ?? "");
  const [bathrooms, setBathrooms] = useState(params.get("bathrooms") ?? "");
  const [sort, setSort] = useState(params.get("sort") ?? "newest");

  function apply() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (town) p.set("town", town);
    if (county) p.set("county", county);
    if (type) p.set("type", type);
    if (minRent) p.set("minRent", minRent);
    if (maxRent) p.set("maxRent", maxRent);
    if (bedrooms) p.set("bedrooms", bedrooms);
    if (bathrooms) p.set("bathrooms", bathrooms);
    p.set("sort", sort);
    p.set("page", "1");
    router.push(`/rentals?${p.toString()}`);
  }

  return (
    <form
      className="card card-pad space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div>
        <label className="label" htmlFor="q">
          Search
        </label>
        <div className="flex gap-2">
          <Input
            id="q"
            placeholder="e.g. apartments in Gataka"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0">
            Search
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="County">
          <Select value={county} onChange={(e) => setCounty(e.target.value)}>
            <option value="">All counties</option>
            {counties.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Town / Area">
          <Select value={town} onChange={(e) => setTown(e.target.value)}>
            <option value="">All towns</option>
            {towns.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Property type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {propertyTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Sort by">
          <Select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest listings</option>
            <option value="rent_asc">Lowest rent</option>
            <option value="rent_desc">Highest rent</option>
          </Select>
        </Field>
        <Field label="Min rent (KSh)">
          <Input
            type="number"
            min={0}
            placeholder="e.g. 5000"
            value={minRent}
            onChange={(e) => setMinRent(e.target.value)}
          />
        </Field>
        <Field label="Max rent (KSh)">
          <Input
            type="number"
            min={0}
            placeholder="e.g. 30000"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
          />
        </Field>
        <Field label="Bedrooms">
          <Select value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
            <option value="">Any</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </Select>
        </Field>
        <Field label="Bathrooms">
          <Select value={bathrooms} onChange={(e) => setBathrooms(e.target.value)}>
            <option value="">Any</option>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>{n}+</option>
            ))}
          </Select>
        </Field>
      </div>

      {(q || town || county || type || minRent || maxRent || bedrooms || bathrooms) && (
        <button
          type="button"
          className="text-sm font-semibold text-brand-600 hover:underline"
          onClick={() => {
            setQ(""); setTown(""); setCounty(""); setType("");
            setMinRent(""); setMaxRent(""); setBedrooms(""); setBathrooms("");
            setSort("newest");
            router.push("/rentals");
          }}
        >
          Clear all filters
        </button>
      )}
    </form>
  );
}
