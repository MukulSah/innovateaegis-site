import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      id="about"
      className="mt-20 border-t border-white/8 bg-[#08070b]/95 px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="lux-kicker">About the house</p>
          <h2 className="font-serif mt-4 text-4xl font-medium tracking-tight text-[#f6f1e8] md:text-5xl">
            Innovative Aegis
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-8 text-white/55">
            A product studio for intelligence that has to live in the world —
            careers, companies, cities, and machines that drive. We reconstruct
            until the surface feels as considered as the system underneath.
          </p>
        </div>

        <div className="space-y-3 text-sm text-white/60">
          <InfoRow label="House" href="https://innovativeaegis.com">
            innovativeaegis.com
          </InfoRow>
          <InfoRow label="CareerMate" href="https://careermate.innovativeaegis.com/">
            careermate.innovativeaegis.com
          </InfoRow>
          <InfoRow label="Connect" href="mailto:hello@innovativeaegis.com">
            hello@innovativeaegis.com
          </InfoRow>
          <p className="pt-6 text-xs tracking-[0.16em] uppercase text-white/30">
            © 2026 Innovative Aegis
          </p>
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
      <span className="font-medium text-white/35">{label}:</span>
      <Link
        href={href}
        target={href.startsWith("mailto:") ? undefined : "_blank"}
        rel="noreferrer"
        className="transition-colors duration-200 hover:text-[#d4b896]"
      >
        {children}
      </Link>
    </p>
  );
}
