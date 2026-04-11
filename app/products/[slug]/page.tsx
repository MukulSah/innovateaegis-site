import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";
import { SiteFooter } from "@/components/site-footer";
import { findProductBySlug, products } from "@/lib/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = findProductBySlug(slug);

  if (slug === "sentra") {
    return {
      title: "Sentra Endpoint Management Software | InnovateAegis",
      description:
        "Sentra gives IT teams real-time visibility and control with endpoint management software, software inventory management, and device-level insights.",
      keywords: [
        "endpoint management software",
        "software inventory management",
        "device management system",
        "IT asset tracking software",
        "Sentra",
        "InnovateAegis",
      ],
      alternates: {
        canonical: "/products/sentra",
      },
      openGraph: {
        title: "Sentra Endpoint Management Software | InnovateAegis",
        description:
          "Modern endpoint management software for software inventory tracking, device visibility, and faster IT control.",
        url: "https://innovativeaegis.com/products/sentra",
        type: "website",
      },
    };
  }

  if (slug === "facenova") {
    return {
      title: "FaceNova Face Recognition Attendance System | InnovateAegis",
      description:
        "FaceNova is a real-time AI-powered face recognition attendance system with multi-camera tracking and high-accuracy attendance logging.",
      keywords: [
        "face recognition attendance system",
        "AI attendance system",
        "real-time face detection",
        "multi-camera attendance tracking",
        "FaceNova",
        "InnovateAegis",
      ],
      alternates: {
        canonical: "/products/facenova",
      },
      openGraph: {
        title: "FaceNova Face Recognition Attendance System | InnovateAegis",
        description:
          "Track attendance in real time with AI-powered face recognition, motion-based detection, and multi-camera support.",
        url: "https://innovativeaegis.com/products/facenova",
        type: "website",
      },
    };
  }

  if (!product) {
    return {
      title: "Product | InnovateAegis",
    };
  }

  return {
    title: `${product.name} | InnovateAegis`,
    description: product.tagline,
  };
}

export default async function ProductPage({ params }: Readonly<ProductPageProps>) {
  const { slug } = await params;
  const product = findProductBySlug(slug);

  if (!product) {
    notFound();
  }

  if (slug === "sentra") {
    return <SentraLandingPage />;
  }

  if (slug === "facenova") {
    return <FacenovaLandingPage />;
  }

  return (
    <>
      <ProductDetail product={product} />
      <SiteFooter />
    </>
  );
}

function SentraLandingPage() {
  const sentraSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Sentra",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows, macOS, Linux",
    creator: {
      "@type": "Organization",
      name: "InnovateAegis",
      url: "https://innovativeaegis.com",
    },
    description:
      "Sentra is endpoint management software and software inventory management platform for complete device visibility and IT control.",
  };

  return (
    <>
      <main className="pt-28 md:pt-32">
        <section className="relative overflow-hidden px-6 pb-20 pt-14 md:px-10 md:pb-24 md:pt-18">
          <div className="pointer-events-none absolute inset-0">
            <div className="orb left-[8%] top-[12%] h-64 w-64 bg-blue-500/20" />
            <div className="orb right-[10%] top-[18%] h-56 w-56 bg-cyan-500/20" style={{ animationDelay: "1.2s" }} />
          </div>
          <div className="relative mx-auto w-full max-w-6xl">
            <p className="inline-flex rounded-full border border-blue-300/25 bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase text-blue-200/80">
              Sentra by InnovateAegis
            </p>
            <h1 className="mt-6 max-w-5xl text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Endpoint Management Software for Complete Device Control
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/75 md:text-lg">
              Sentra gives IT teams full visibility into what software is installed across company devices,
              with fast control actions and clean reporting from one dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Software inventory management</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Device management system</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">IT asset tracking software</span>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#request-demo"
                className="glow-btn rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-7 py-3 text-sm font-semibold text-white"
              >
                Request Demo
              </a>
              <Link
                href="/products"
                className="rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                Explore Sentra
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Why endpoint visibility breaks at scale</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Lack of visibility across devices</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Most teams cannot answer a simple question fast: what software is installed on every machine right now.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Shadow IT risk</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Unapproved apps spread quietly, expanding attack surface and creating unmanaged endpoints.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Compliance blind spots</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Manual records fail audits because they are stale, inconsistent, and hard to verify.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Manual tracking inefficiency</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Spreadsheet-driven workflows consume IT time and delay decisions during incidents.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-blue-300/20 bg-blue-500/8 p-8 md:p-12">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">How Sentra solves it</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              <div>
                <h3 className="text-xl font-semibold text-white">Centralized software tracking</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Sentra maintains one live inventory across endpoints so teams can detect unknown software and enforce policy quickly.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Real-time device insights</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Track software changes as they happen and respond before configuration drift becomes operational risk.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Clean dashboard for IT teams</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Fast filtering, searchable inventory, and clear status indicators give teams control without bloated workflows.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Core features built for modern IT operations</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Software inventory tracking</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Capture installed software across all managed devices and maintain accurate historical records.
                </p>
              </article>
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Device-level visibility</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Drill down from organization view to individual endpoint status without switching tools.
                </p>
              </article>
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Real-time updates</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Monitor software state changes continuously to improve incident response and compliance readiness.
                </p>
              </article>
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Lightweight and scalable architecture</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Designed as a modern endpoint management software platform that stays fast as endpoints grow.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Use cases</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">IT teams</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Build a reliable device management system and reduce time spent on software audits.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Startups scaling infrastructure</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Move from ad-hoc tracking to predictable endpoint governance before scale introduces risk.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Enterprises with many endpoints</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Standardize IT asset tracking software workflows across offices, departments, and device pools.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Sentra vs traditional enterprise tools</h2>
            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/5 text-white/85">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Criteria</th>
                    <th className="px-5 py-4 font-semibold">Sentra</th>
                    <th className="px-5 py-4 font-semibold">Traditional tools</th>
                  </tr>
                </thead>
                <tbody className="bg-[#060818]/60 text-white/70">
                  <tr className="border-t border-white/10">
                    <td className="px-5 py-4">Setup and adoption</td>
                    <td className="px-5 py-4">Simple onboarding and fast rollout</td>
                    <td className="px-5 py-4">Heavy setup cycles and complex configuration</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="px-5 py-4">Performance</td>
                    <td className="px-5 py-4">Lightweight architecture with responsive UI</td>
                    <td className="px-5 py-4">Bulky interfaces and slower operations</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="px-5 py-4">Engineering fit</td>
                    <td className="px-5 py-4">Developer-friendly workflows and clean data access</td>
                    <td className="px-5 py-4">Rigid workflows and limited flexibility</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="request-demo" className="px-6 pb-24 pt-8 md:px-10 md:pb-28">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-blue-300/20 bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-indigo-500/20 p-8 md:p-12">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Take control of your endpoint environment with Sentra
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
              Replace fragmented tracking with endpoint management software built for visibility, speed,
              and operational confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="mailto:hello@innovativeaegis.com?subject=Sentra%20Demo%20Request"
                className="glow-btn rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-900"
              >
                Request Demo
              </a>
              <Link
                href="/"
                className="rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white"
              >
                Visit InnovateAegis Homepage
              </Link>
            </div>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(sentraSchema) }}
        />
      </main>
      <SiteFooter />
    </>
  );
}

function FacenovaLandingPage() {
  const facenovaSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "FaceNova",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    creator: {
      "@type": "Organization",
      name: "InnovateAegis",
      url: "https://innovativeaegis.com",
    },
    description:
      "FaceNova is a real-time AI-powered face recognition attendance system for offices, schools, factories, and events.",
  };

  return (
    <>
      <main className="pt-28 md:pt-32">
        <section className="relative overflow-hidden px-6 pb-20 pt-14 md:px-10 md:pb-24 md:pt-18">
          <div className="pointer-events-none absolute inset-0">
            <div className="orb left-[8%] top-[12%] h-64 w-64 bg-cyan-500/20" />
            <div className="orb right-[10%] top-[18%] h-56 w-56 bg-blue-500/20" style={{ animationDelay: "1.2s" }} />
          </div>
          <div className="relative mx-auto w-full max-w-6xl">
            <p className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase text-cyan-100/90">
              FaceNova by InnovateAegis
            </p>
            <h1 className="mt-6 max-w-5xl text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              Manual attendance creates delays and errors. FaceNova fixes it with a real-time face recognition attendance system.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/75 md:text-lg">
              FaceNova captures attendance in real time using AI-powered face recognition, so teams can track presence
              accurately across entry points without queues, buddy punching, or spreadsheet cleanup.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Real-time face detection</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Multi-camera tracking</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Motion-based recognition</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">High-accuracy attendance</span>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="#book-demo"
                className="glow-btn rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-7 py-3 text-sm font-semibold text-white"
              >
                Book Demo
              </a>
              <a
                href="mailto:hello@innovativeaegis.com?subject=FaceNova%20Product%20Inquiry"
                className="rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                Contact Team
              </a>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">How FaceNova works in real environments</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">1. Capture live video streams</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Cameras at entry and movement points stream frames continuously to FaceNova.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">2. Detect and match faces in real time</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  The system detects faces, validates identity against enrolled profiles, and records attendance instantly.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">3. Sync attendance logs to dashboard</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  IT and operations teams review timestamped events, late arrivals, and exceptions from one dashboard.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-cyan-300/20 bg-cyan-500/8 p-8 md:p-12">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Core features of FaceNova</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Real-time face detection</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Detect and process attendance events as people move through monitored zones.
                </p>
              </article>
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Multi-camera tracking</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Correlate attendance across multiple camera feeds for large campuses and multi-gate facilities.
                </p>
              </article>
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Motion-based recognition</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Use movement-aware detection to reduce false events and improve reliability in active environments.
                </p>
              </article>
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">High accuracy identity matching</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Deliver precise attendance records that can be trusted for payroll, compliance, and audits.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Built for high-throughput attendance operations</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Offices</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Replace manual check-ins with seamless attendance logging for staff and visitors.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Schools</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Track student and faculty attendance quickly with accurate, searchable records.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Factories</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Monitor shift attendance at multiple gates without slowing worker flow.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Events</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Verify check-ins at scale for conferences, summits, and managed-access venues.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Benefits over manual attendance and biometric systems</h2>
            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-white/5 text-white/85">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Approach</th>
                    <th className="px-5 py-4 font-semibold">Operational downside</th>
                    <th className="px-5 py-4 font-semibold">FaceNova advantage</th>
                  </tr>
                </thead>
                <tbody className="bg-[#060818]/60 text-white/70">
                  <tr className="border-t border-white/10">
                    <td className="px-5 py-4">Manual registers and spreadsheets</td>
                    <td className="px-5 py-4">Slow, error-prone, and easy to manipulate</td>
                    <td className="px-5 py-4">Automated real-time logs with verifiable timestamps</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="px-5 py-4">Fingerprint or card-based systems</td>
                    <td className="px-5 py-4">Physical dependency, queue friction, and hygiene concerns</td>
                    <td className="px-5 py-4">Contactless attendance with faster throughput</td>
                  </tr>
                  <tr className="border-t border-white/10">
                    <td className="px-5 py-4">Single-point attendance devices</td>
                    <td className="px-5 py-4">Poor coverage for distributed entry points</td>
                    <td className="px-5 py-4">Multi-camera tracking for wide-area coverage</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="book-demo" className="px-6 pb-24 pt-8 md:px-10 md:pb-28">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-cyan-300/20 bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-indigo-500/20 p-8 md:p-12">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              Deploy a face recognition attendance system your team can trust
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
              FaceNova gives you real-time visibility, high-accuracy attendance records, and scalable deployment
              across offices, schools, factories, and events.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="mailto:hello@innovativeaegis.com?subject=FaceNova%20Demo%20Request"
                className="glow-btn rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-900"
              >
                Book Demo
              </a>
              <Link
                href="/"
                className="rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white"
              >
                Contact InnovateAegis
              </Link>
            </div>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(facenovaSchema) }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
