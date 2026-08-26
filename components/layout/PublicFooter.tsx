import Link from "next/link";

export default function PublicFooter({
  platformName,
  supportEmail,
  supportPhone,
}: {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
}) {
  return (
    <footer className="border-t border-slate-800 bg-slate-900 text-slate-300">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-black text-white">
              RE
            </span>
            <span className="font-bold text-white">{platformName}</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">
            Find your next home and manage your property — all in one place. Trusted rental management for
            landlords and tenants across Kenya.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-white">Platform</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/rentals" className="hover:text-white">Search Rentals</Link></li>
            <li><Link href="/register/building" className="hover:text-white">Register Your Building</Link></li>
            <li><Link href="/register/tenant" className="hover:text-white">Register as Tenant</Link></li>
            <li><Link href="/login" className="hover:text-white">Login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-white">Company</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/#about" className="hover:text-white">About Us</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-white">How It Works</Link></li>
            <li><Link href="/#features" className="hover:text-white">Features</Link></li>
            <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-white">Contact</h4>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`tel:${supportPhone}`} className="hover:text-white">{supportPhone}</a>
            </li>
            <li>
              <a href={`mailto:${supportEmail}`} className="hover:text-white">{supportEmail}</a>
            </li>
            <li className="text-slate-400">Mon–Sat, 8:00am – 6:00pm EAT</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {platformName}. All rights reserved. Built for Kenyan landlords & tenants.
      </div>
    </footer>
  );
}
