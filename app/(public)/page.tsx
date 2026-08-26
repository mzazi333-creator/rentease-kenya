import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/services/settings-service";
import { searchRentals, type RentalSearchResult } from "@/lib/services/search-service";
import BuildingCard from "@/components/rentals/BuildingCard";

export const dynamic = "force-dynamic";

const EMPTY_SEARCH: RentalSearchResult = {
  buildings: [],
  total: 0,
  page: 1,
  pageSize: 3,
  totalPages: 1,
};

export default async function LandingPage() {
  // The public site degrades gracefully if the database is briefly
  // unavailable (zeros and empty states instead of a hard crash).
  let stats = [0, 0, 0, 0];
  let featured = EMPTY_SEARCH;
  let settings = null;
  try {
    stats = await prisma.$transaction([
      prisma.building.count({ where: { status: "APPROVED" } }),
      prisma.unit.count({ where: { availability: "VACANT" } }),
      prisma.user.count({ where: { role: "TENANT" } }),
      prisma.user.count({ where: { role: "LANDLORD" } }),
    ]);
  } catch {
    // ignore — page renders with zero stats
  }
  try {
    featured = await searchRentals({ page: 1, pageSize: 3, sort: "newest" });
  } catch {
    // ignore — featured section hidden
  }
  try {
    settings = await getSettings();
  } catch {
    // ignore — defaults used
  }

  const [approvedBuildings, vacantUnits, tenants, landlords] = stats;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-10" aria-hidden="true">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-accent-400 blur-3xl" />
        </div>
        <div className="container-page relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-100 ring-1 ring-white/20">
              🇰🇪 Kenya&apos;s trusted rental management platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find Your Next Home.
              <br />
              Manage Your Property.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-brand-100/90">
              RentEase connects landlords and tenants in Kenya. List your building, find vacant houses,
              and confirm M-Pesa rent payments — all in one place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/rentals" className="btn-accent !px-6 !py-3 !text-base">
                Search for a Rental
              </Link>
              <Link href="/register/building" className="btn !border !border-white/30 !bg-white/10 !px-6 !py-3 !text-base !text-white hover:!bg-white/20">
                Register Your Building
              </Link>
              <Link href="/register/tenant" className="btn !border !border-white/30 !bg-white/10 !px-6 !py-3 !text-base !text-white hover:!bg-white/20">
                Register as Tenant
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: approvedBuildings, label: "Approved Buildings" },
              { value: vacantUnits, label: "Vacant Houses" },
              { value: tenants, label: "Tenants" },
              { value: landlords, label: "Landlords" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 px-4 py-4 text-center ring-1 ring-white/15">
                <p className="text-3xl font-extrabold">{s.value}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-brand-100/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured rentals (live data) ── */}
      {featured.buildings.length > 0 && (
        <section className="container-page py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Featured Rentals</h2>
              <p className="mt-1 text-slate-500">Real available houses from approved buildings.</p>
            </div>
            <Link href="/rentals" className="btn-secondary">
              View all →
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.buildings.map((b) => (
              <BuildingCard key={b.id} building={b} />
            ))}
          </div>
        </section>
      )}

      {/* ── About ── */}
      <section id="about" className="border-y border-slate-200 bg-white py-16">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">About RentEase</h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              RentEase is a Kenyan rental property management platform that brings landlords and tenants
              together. Landlords register their buildings and houses online; tenants search, apply, and
              pay rent using M-Pesa — with every transaction confirmed by our team to keep things safe
              and transparent.
            </p>
            <p className="mt-3 leading-relaxed text-slate-600">
              Every building is reviewed and approved by our administrators before it appears on the
              platform, so you can trust that what you see is real.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                Create Free Account
              </Link>
              <Link href="/#how-it-works" className="btn-secondary">
                How it works
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: "🏢", title: "Approved Buildings", text: "Every property is verified before going live" },
              { icon: "🔐", title: "Secure Payments", text: "M-Pesa codes confirmed by administrators" },
              { icon: "📱", title: "Mobile First", text: "Works beautifully on any Android phone" },
              { icon: "🤝", title: "Trusted Community", text: "Landlords and tenants in one platform" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 p-4">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-2 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">How It Works</h2>
            <p className="mt-2 text-slate-500">Three simple journeys — one platform.</p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="card card-pad">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-lg font-black text-brand-700">1</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">For Landlords</h3>
              <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
                <li>• Create an account and register your building</li>
                <li>• Define floors and house numbers — any format you like</li>
                <li>• Set monthly rent for each house</li>
                <li>• Get approved, then track rent payments & tenants</li>
              </ol>
              <Link href="/register/building" className="btn-primary mt-5 w-full">
                Register Your Building
              </Link>
            </div>
            <div className="card card-pad">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-lg font-black text-brand-700">2</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">For Tenants</h3>
              <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
                <li>• Search approved buildings in your area</li>
                <li>• Pick a vacant house and apply</li>
                <li>• Get approved and move in</li>
                <li>• Pay rent via M-Pesa, submit the code, done</li>
              </ol>
              <Link href="/register/tenant" className="btn-primary mt-5 w-full">
                Register as Tenant
              </Link>
            </div>
            <div className="card card-pad">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-lg font-black text-brand-700">3</div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Payment Confirmation</h3>
              <ol className="mt-3 space-y-2.5 text-sm text-slate-600">
                <li>• Pay your rent through M-Pesa Paybill/Till</li>
                <li>• Enter the transaction code you received by SMS</li>
                <li>• Our team verifies the transaction</li>
                <li>• Rent is marked PAID — you get instant notification</li>
              </ol>
              <Link href="/#faq" className="btn-secondary mt-5 w-full">
                Read the FAQ
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-y border-slate-200 bg-white py-16">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Everything You Need</h2>
            <p className="mt-2 text-slate-500">Powerful property management, designed for Kenya.</p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "🏠", title: "Flexible Building Structure", text: "Any floor names, any house numbers — 001, 61B, A1, Shop 4. Your building, your numbering." },
              { icon: "📋", title: "Admin Approval Workflow", text: "Buildings and tenants are reviewed and approved before going live." },
              { icon: "📱", title: "M-Pesa Rent Payments", text: "Paybill or Till payments with transaction code verification by our admins." },
              { icon: "📊", title: "Real-time Dashboards", text: "Landlords and tenants see live rent status: PAID, PENDING or OVERDUE." },
              { icon: "🔍", title: "Smart Rental Search", text: "Filter by location, rent, bedrooms, bathrooms and property type." },
              { icon: "🔔", title: "Instant Notifications", text: "Approvals, payment confirmations and rent reminders — right in your dashboard." },
              { icon: "📈", title: "Reports & Analytics", text: "Admins get rent collection, occupancy and overdue reports." },
              { icon: "🛡️", title: "Secure & Private", text: "Role-based access, encrypted passwords, and no public tenant data." },
              { icon: "📅", title: "Smart Rent Deadlines", text: "Default 5th of the month, configurable per building." },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 p-5 transition-shadow hover:shadow-md">
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For Landlords ── */}
      <section id="landlords" className="py-16">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <Image
              src="/landlord-illustration.svg"
              alt="Landlord managing property"
              width={560}
              height={420}
              className="rounded-2xl border border-slate-200"
            />
          </div>
          <div className="order-1 lg:order-2">
            <span className="badge bg-brand-100 text-brand-800">For Landlords</span>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Why Landlords Choose RentEase</h2>
            <ul className="mt-5 space-y-3 text-slate-600">
              <li className="flex gap-3"><span className="text-brand-600">✔</span> Register your building once — floors, houses and rents all structured your way.</li>
              <li className="flex gap-3"><span className="text-brand-600">✔</span> Never chase rent manually again: tenants submit M-Pesa codes and admins confirm.</li>
              <li className="flex gap-3"><span className="text-brand-600">✔</span> See exactly who lives in which house, who has paid, and who is overdue.</li>
              <li className="flex gap-3"><span className="text-brand-600">✔</span> Keep full payment history — no more lost paper records.</li>
              <li className="flex gap-3"><span className="text-brand-600">✔</span> Reach thousands of verified tenants searching for homes.</li>
            </ul>
            <Link href="/register/building" className="btn-primary mt-6">
              Start Managing Your Property
            </Link>
          </div>
        </div>
      </section>

      {/* ── For Tenants ── */}
      <section id="tenants" className="border-y border-slate-200 bg-white py-16">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="badge bg-accent-100 text-accent-800">For Tenants</span>
            <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Find a Home You Can Trust</h2>
            <ul className="mt-5 space-y-3 text-slate-600">
              <li className="flex gap-3"><span className="text-accent-600">✔</span> Browse only approved buildings with verified, vacant houses.</li>
              <li className="flex gap-3"><span className="text-accent-600">✔</span> Apply online in minutes — no brokers, no middlemen.</li>
              <li className="flex gap-3"><span className="text-accent-600">✔</span> Pay rent from your phone with M-Pesa and track every payment.</li>
              <li className="flex gap-3"><span className="text-accent-600">✔</span> Know your rent deadline: PAID, PENDING or OVERDUE at a glance.</li>
              <li className="flex gap-3"><span className="text-accent-600">✔</span> Get notified the moment your application or payment is confirmed.</li>
            </ul>
            <Link href="/rentals" className="btn-primary mt-6">
              Search Available Rentals
            </Link>
          </div>
          <div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-sm font-semibold text-slate-500">Example listing</p>
              {featured.buildings[0] ? (
                <BuildingCard building={featured.buildings[0]} />
              ) : (
                <div className="card card-pad">
                  <p className="text-sm text-slate-600">
                    Once buildings are approved, you&apos;ll see real listings here with rent, location and
                    available houses.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-16">
        <div className="container-page mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Frequently Asked Questions</h2>
            <p className="mt-2 text-slate-500">Everything you need to know about RentEase.</p>
          </div>
          <div className="mt-8 space-y-3">
            {[
              {
                q: "How do I pay rent?",
                a: "Pay through M-Pesa using the Paybill or Till number shown in your tenant dashboard (sent to you once you're assigned a house). After paying, enter the transaction code from the M-Pesa SMS, the amount and the date. Our administrators verify and confirm your payment.",
              },
              {
                q: "When is rent due?",
                a: "The default due date is the 5th of every month. Your landlord may configure a different due date for your building — the dashboard always shows your exact due date and current status (PAID, PENDING or OVERDUE).",
              },
              {
                q: "How do I register my building?",
                a: "Create a landlord account, then go to 'Register Your Building'. Enter the property details, define floors and houses with any numbering you prefer, set rents, and submit. An administrator reviews and approves it before it goes live.",
              },
              {
                q: "How do I apply for a house?",
                a: "Search for rentals, open a building, and choose a vacant house. Click 'Apply for This House', complete your tenant details, and submit. Once an administrator approves, you are assigned the house.",
              },
              {
                q: "Is my information safe?",
                a: "Yes. Passwords are encrypted, access is role-based (landlords only see their own property, tenants only their own data), and tenant information is never shown publicly.",
              },
              {
                q: "What does it cost?",
                a: "Registration is free for landlords and tenants. Rent payments are made directly to the landlord's M-Pesa account — the platform does not take a cut.",
              },
              {
                q: "What if my payment is rejected?",
                a: "If a transaction code can't be verified, an administrator rejects it with a reason and you'll be notified instantly. You can then re-submit with the correct code.",
              },
            ].map((f, i) => (
              <details key={i} className="card card-pad group">
                <summary className="cursor-pointer list-none font-semibold text-slate-900">
                  <span className="flex items-center justify-between gap-3">
                    {f.q}
                    <span className="text-slate-400 transition-transform group-open:rotate-45">＋</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="border-t border-slate-200 bg-white py-16">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Contact Us</h2>
            <p className="mt-3 text-slate-600">
              Questions about a listing, your account, or a payment? Our support team is ready to help.
            </p>
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-lg">📞</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Support Phone</p>
                  <a href={`tel:${settings?.supportPhone ?? ""}`} className="text-sm text-brand-600 hover:underline">
                    {settings?.supportPhone ?? "—"}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-lg">✉️</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Support Email</p>
                  <a href={`mailto:${settings?.supportEmail ?? ""}`} className="text-sm text-brand-600 hover:underline">
                    {settings?.supportEmail ?? "—"}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-lg">🕐</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Working Hours</p>
                  <p className="text-sm text-slate-600">Monday – Saturday, 8:00am – 6:00pm (EAT)</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card card-pad">
            <h3 className="text-lg font-bold text-slate-900">Need a rental or want to list one?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Create a free account to get started — no paperwork, no queues.
            </p>
            <div className="mt-5 space-y-3">
              <Link href="/rentals" className="btn-primary w-full">Search for a Rental</Link>
              <Link href="/register/building" className="btn-secondary w-full">Register Your Building</Link>
              <Link href="/register/tenant" className="btn-secondary w-full">Register as Tenant</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="bg-gradient-to-r from-brand-800 to-brand-600 py-14 text-white">
        <div className="container-page text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to get started?</h2>
          <p className="mx-auto mt-2 max-w-xl text-brand-100">
            Join hundreds of landlords and tenants managing their property the modern way.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-accent !px-6 !py-3">Create Free Account</Link>
            <Link href="/rentals" className="btn !border !border-white/30 !bg-white/10 !px-6 !py-3 !text-white hover:!bg-white/20">
              Browse Rentals
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
