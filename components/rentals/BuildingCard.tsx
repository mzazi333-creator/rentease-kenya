import Link from "next/link";
import Image from "next/image";
import type { RentalCard } from "@/lib/services/search-service";
import { formatKSh } from "@/lib/utils";

export default function BuildingCard({ building }: { building: RentalCard }) {
  return (
    <Link
      href={`/rentals/${building.id}`}
      className="card group overflow-hidden transition-shadow hover:shadow-lg"
    >
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        {building.image ? (
          <Image
            src={building.image}
            alt={building.name}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-4xl">
            🏢
          </div>
        )}
        <span className="absolute left-3 top-3 badge bg-white/95 text-brand-800 shadow-sm">
          {building.propertyType}
        </span>
        {building.availableUnits > 0 && (
          <span className="absolute right-3 top-3 badge bg-green-600 text-white shadow-sm">
            {building.availableUnits} available
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-slate-900 group-hover:text-brand-700">{building.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {building.town}, {building.county}
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
          <div>
            <p className="text-xs text-slate-400">Starting at</p>
            <p className="font-bold text-brand-700">
              {building.startingRent !== null ? formatKSh(building.startingRent) : "—"}
              <span className="text-xs font-medium text-slate-400">/mo</span>
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>{building.numberOfFloors} floor{building.numberOfFloors === 1 ? "" : "s"}</p>
            <p className="text-slate-400">View details →</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
