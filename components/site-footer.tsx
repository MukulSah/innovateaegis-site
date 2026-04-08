import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      id="about"
      className="mt-24 border-t border-purple-400/10 bg-[#050510]/95 px-6 py-16 md:px-10"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/60">
            About
          </p>
          <h2 className="gradient-text mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Innovative Aegis
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">
            Controlled systems for enterprise and consumer products. Built with
            precision, surfaced with clarity, and animated with purpose.
          </p>
        </div>

        <div className="space-y-3 text-sm text-white/60">
          <InfoRow label="Website" href="https://innovativeaegis.com">
            innovativeaegis.com
          </InfoRow>
          <InfoRow label="GitHub" href="https://github.com/">
            github.com/innovativeaegis
          </InfoRow>
          <InfoRow label="Google Connect" href="https://mail.google.com/">
            connect via Google
          </InfoRow>
          <p className="pt-5 text-xs text-white/25">© 2026 Innovative Aegis</p>
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
      <span className="font-medium text-white/40">{label}:</span>
      <Link
        href={href}
        target="_blank"
        rel="noreferrer"
        className="transition-colors duration-200 hover:text-purple-300"
      >
        {children}
      </Link>
    </p>
  );
}
