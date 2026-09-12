"use client";

import Link from "next/link";
import type { Product } from "@/lib/products";

const fleet = [
  {
    name: "Toyota Innova Crysta",
    kind: "Taxi / MPV · 7 seats",
    spec: "4735 × 1830 × 1795 mm · 5-speed MT + clutch",
  },
  {
    name: "Kia Carens",
    kind: "Taxi / MPV · 7 seats",
    spec: "4540 × 1800 × 1708 mm · 6-speed AT",
  },
  {
    name: "Mahindra XUV700",
    kind: "SUV · 7 seats",
    spec: "4695 × 1890 × 1755 mm · 6-speed AT",
  },
];

const stages = [
  { step: "01", title: "Garage", text: "Select the taxi. The front bay shows the car you will drop. Sensors and size follow the published spec." },
  { step: "02", title: "Sensors", text: "Tune cameras, LiDAR, radar, and GNSS / IMU before the map loads. Lower gain means more caution." },
  { step: "03", title: "Track", text: "Four Indian cities first — Bengaluru, Mumbai, Delhi, Chennai. Pick the map, then the event." },
  { step: "04", title: "Event", text: "Choose the run — like a circuit, then a race mode — for weather, density, and drop." },
  { step: "05", title: "Drop", text: "Place the taxi and drive. Indiranagar. Highway mouth. Clear day. Local." },
];

const sensors = ["Cameras", "LiDAR", "Radar", "GNSS / IMU"];

const tracks = [
  { city: "Bengaluru", note: "Karnataka · 50 km/h · medium · MG Road grain, mixed two-wheelers" },
  { city: "Mumbai", note: "Maharashtra · 30 km/h · heavy" },
  { city: "Delhi", note: "NCT · 40 km/h · heavy" },
  { city: "Chennai", note: "Tamil Nadu · 50 km/h · medium" },
];

const driveView = [
  { title: "Mirrors", text: "Left, rear, and right on Drive and 3D World." },
  { title: "Cabin & steering", text: "Sit in the seat — dashboard and wheel in the windshield." },
  { title: "Start in manual", text: "Keyboard takes the wheel from drop when you want the human path." },
];

type Props = { product: Product };

export function AuroraLanding({ product }: Props) {
  return (
    <div className="relative z-0 pt-40 md:pt-44">
      <main>
        <section className="relative overflow-hidden px-6 pb-12 pt-10 md:px-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="aurora-lamp light-bloom left-[4%] top-[18%] h-48 w-[32rem] bg-[#fff3d4]/20" />
            <div className="aurora-lamp light-bloom right-[6%] top-[22%] h-40 w-[26rem] bg-[#9ec5d4]/16" style={{ animationDelay: "1.2s" }} />
          </div>
          <div className="relative mx-auto w-full max-w-6xl">
            <p className="lux-kicker">Being cooked · Indian streets</p>
            <h1 className="font-serif mt-6 max-w-5xl text-5xl leading-[1.05] text-[#f6f1e8] md:text-7xl">
              Aurora — robotaxi garage for Indian streets.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/62">
              {product.description} The control center is already running: pick an Innova Crysta,
              kit the sensors, choose Bengaluru or Mumbai, and drop into Indiranagar.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="mailto:hello@innovativeaegis.com?subject=Aurora%20AI" className="lux-btn rounded-full px-7 py-3.5 text-sm font-semibold">
                Request garage access
              </a>
              <Link href="/#connect" className="rounded-full border border-white/12 px-7 py-3.5 text-sm font-semibold">
                Talk to the studio
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 pb-8 md:px-10">
          <figure className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0b1018] shadow-[0_40px_80px_rgba(0,0,0,0.35)]">
            <img
              src="/aurora/garage.png"
              alt="Aurora garage local simulator showing a Toyota Innova Crysta on the turntable"
              className="h-auto w-full"
            />
            <figcaption className="border-t border-white/8 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-[#d4b896]/80">
              Garage · Front · Toyota Innova Crysta · 5MT
            </figcaption>
          </figure>
        </section>

        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <p className="lux-kicker">Select the taxi</p>
            <h2 className="font-serif mt-4 max-w-3xl text-4xl text-[#f6f1e8]">
              Indian fleet first. Sensors and size change with the published spec.
            </h2>
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <figure className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0b1018]">
                <img
                  src="/aurora/fleet.png"
                  alt="Aurora fleet picker with Innova Crysta, Kia Carens, and Mahindra XUV700"
                  className="h-auto w-full"
                />
              </figure>
              <div className="space-y-4">
                {fleet.map((car) => (
                  <article key={car.name} className="lux-panel rounded-2xl p-5">
                    <h3 className="text-lg font-semibold text-white">{car.name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#d4b896]">{car.kind}</p>
                    <p className="mt-2 text-sm text-white/55">{car.spec}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <p className="lux-kicker">Control center</p>
            <h2 className="font-serif mt-4 text-4xl text-[#f6f1e8]">Garage to drop. Five steps.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-5">
              {stages.map((item) => (
                <article key={item.step} className="lux-panel rounded-2xl p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#d4b896]">{item.step}</p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10">
          <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-2">
            <figure className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0b1018]">
              <img
                src="/aurora/sensors.png"
                alt="Aurora sensors stage with the Innova Crysta in the garage bay"
                className="h-auto w-full"
              />
              <figcaption className="border-t border-white/8 px-5 py-3 text-[11px] uppercase tracking-[0.18em] text-white/40">
                02 Sensors · Aurora Research Sensor Profile A
              </figcaption>
            </figure>
            <div className="lux-panel rounded-[1.4rem] p-8">
              <p className="lux-kicker">Installed stack</p>
              <h2 className="font-serif mt-4 text-3xl text-[#f6f1e8]">Cameras, LiDAR, radar, GNSS.</h2>
              <p className="mt-4 text-sm leading-7 text-white/58">
                Set sensitivity before the map loads. The same Innova that sits in the garage carries this kit into Drive and 3D World.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {sensors.map((name) => (
                  <span key={name} className="rounded-full border border-[#d4b896]/25 px-4 py-2 text-sm text-white/75">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <p className="lux-kicker">Indian tracks</p>
            <h2 className="font-serif mt-4 max-w-3xl text-4xl text-[#f6f1e8]">
              Pick the city first. Then the event.
            </h2>
            <figure className="mt-8 overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0b1018]">
              <img
                src="/aurora/track.png"
                alt="Aurora track stage with the Innova Crysta ready for an Indian city map"
                className="h-auto w-full"
              />
            </figure>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {tracks.map((track) => (
                <article key={track.city} className="lux-panel rounded-2xl p-5">
                  <h3 className="text-lg font-semibold text-white">{track.city}</h3>
                  <p className="mt-2 text-sm text-white/55">{track.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <p className="lux-kicker">Drive view</p>
            <h2 className="font-serif mt-4 text-4xl text-[#f6f1e8]">What you see after drop.</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {driveView.map((item) => (
                <article key={item.title} className="lux-panel rounded-3xl p-7">
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/58">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-24 pt-8 md:px-10">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-[#d4b896]/25 bg-[#d4b896]/8 p-8 md:p-12">
            <p className="lux-kicker">Indiranagar drop</p>
            <h2 className="font-serif mt-4 text-4xl text-[#f6f1e8] md:text-5xl">
              Aurora is not a highway demo. It is a cook for Indian streets.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/62">
              The garage already runs on Innova Crysta, a sensor kit, Bengaluru track, drop and drive.
              The driving model is still being finished for mixed traffic, monsoon, and the living geometry of the city.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="mailto:hello@innovativeaegis.com?subject=Aurora%20AI" className="lux-btn inline-flex rounded-full px-7 py-3.5 text-sm font-semibold">
                Write about Aurora
              </a>
              <Link href="/products" className="rounded-full border border-white/12 px-7 py-3.5 text-sm font-semibold">
                All products
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
