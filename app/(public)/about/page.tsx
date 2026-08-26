import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "About Us" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [buildings, units, tenants, landlords] = await Promise.all([
    prisma.building.count({ where: { status: "APPROVED" } }),
    prisma.unit.count({ where: { availability: "VACANT" } }),
    prisma.user.count({ where: { role: "TENANT" } }),
    prisma.user.count({ where: { role: "LANDLORD" } }),
  ]);

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold text-slate-900">About RentEase Kenya</h1>
        <div className="prose-slate mt-6 space-y-4 leading-relaxed text-slate-600">
          <p>
            RentEase was built to solve a very real problem in Kenya&apos;s rental market: landlords struggle
            to manage multiple houses, track rent, and find trustworthy tenants — while tenants struggle
            to find genuine, available houses without paying brokers.
          </p>
          <p>
            Our platform connects the two sides. Landlords register their buildings with a fully flexible
            structure — any floor names, any house numbering — and list every house with its rent,
            deposit and amenities. Every building is reviewed and approved by our administrators before
            it becomes visible, which keeps listings genuine.
          </p>
          <p>
            Tenants search approved buildings, apply for vacant houses online, and once approved, pay
            rent using M-Pesa. They submit their transaction code and our team verifies each payment, so
            landlords can trust the money is real and tenants can prove they paid.
          </p>
          <p>
            With rent deadlines, automatic PAID / PENDING / OVERDUE statuses, complete payment history
            and clear reporting, RentEase brings order and transparency to property management.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { v: buildings, l: "Approved Buildings" },
            { v: units, l: "Vacant Houses" },
            { v: tenants, l: "Tenants" },
            { v: landlords, l: "Landlords" },
          ].map((s) => (
            <div key={s.l} className="card card-pad text-center">
              <p className="text-2xl font-extrabold text-brand-700">{s.v}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 card card-pad text-center">
          <h2 className="text-lg font-bold text-slate-900">Ready to join?</h2>
          <p className="mt-1 text-sm text-slate-500">Registration is free for both landlords and tenants.</p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/register/building" className="btn-primary">Register Your Building</Link>
            <Link href="/register/tenant" className="btn-secondary">Register as Tenant</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
