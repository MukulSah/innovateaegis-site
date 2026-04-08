import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      id="about"
      className="mt-24 border-t border-white/10 bg-slate-950/95 px-6 py-16 md:px-10"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            About
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
            Innovative Aegis
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
            Controlled systems for enterprise and consumer products. Built with
            precision, surfaced with clarity, and animated with restraint.
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-300">
          <InfoRow label="Website" href="https://innovativeaegis.com">
            innovativeaegis.com
          </InfoRow>
          <InfoRow label="GitHub" href="https://github.com/">
            github.com/innovativeaegis
          </InfoRow>
          <InfoRow label="Google Connect" href="https://mail.google.com/">
            connect via Google
          </InfoRow>
          <p className="pt-5 text-xs text-slate-500">© 2026 Innovative Aegis</p>
        </div>
      </div>
    </footer>
  );
}

type InfoRowProps = {
  label: string;
  href: string;
  children: React.ReactNode;
};

function InfoRow({ label, href, children }: InfoRowProps) {
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className="font-medium text-slate-400">{label}:</span>
      <Link
        href={href}
        target="_blank"
        rel="noreferrer"
        className="transition-colors duration-300 hover:text-indigo-200"
      >
        {children}
      </Link>
    </p>
  );
}
