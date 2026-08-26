import type { Metadata } from "next";
import { searchRentals, getFilterOptions } from "@/lib/services/search-service";
import BuildingCard from "@/components/rentals/BuildingCard";
import SearchFilters from "@/components/rentals/SearchFilters";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/Layout";

export const metadata: Metadata = { title: "Search Rentals" };
export const dynamic = "force-dynamic";

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return typeof v === "string" ? v : undefined;
  };

  const filters = {
    q: one("q"),
    town: one("town"),
    county: one("county"),
    propertyType: one("type"),
    minRent: one("minRent") ? Number(one("minRent")) : undefined,
    maxRent: one("maxRent") ? Number(one("maxRent")) : undefined,
    bedrooms: one("bedrooms") ? Number(one("bedrooms")) : undefined,
    bathrooms: one("bathrooms") ? Number(one("bathrooms")) : undefined,
    sort: (one("sort") ?? "newest") as "rent_asc" | "rent_desc" | "newest",
    page: one("page") ? Number(one("page")) : 1,
  };

  const [result, options] = await Promise.all([searchRentals(filters), getFilterOptions()]);

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">Search Rentals</h1>
        <p className="mt-1 text-slate-500">
          Only approved buildings with vacant houses are shown. Every listing is real.
        </p>
      </div>

      <SearchFilters
        counties={options.counties}
        towns={options.towns}
        propertyTypes={options.propertyTypes}
      />

      <div className="mt-8">
        <p className="mb-4 text-sm font-medium text-slate-500">
          {result.total === 0 ? "No rentals found" : `${result.total} building${result.total === 1 ? "" : "s"} found`}
        </p>
        {result.buildings.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No rentals found"
            description="Try adjusting your filters or search in a different area. New buildings are added all the time."
            action={
              <a href="/rentals" className="btn-primary">
                Reset filters
              </a>
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {result.buildings.map((b) => (
              <BuildingCard key={b.id} building={b} />
            ))}
          </div>
        )}
        <Pagination page={result.page} totalPages={result.totalPages} basePath="/rentals" />
      </div>
    </div>
  );
}
