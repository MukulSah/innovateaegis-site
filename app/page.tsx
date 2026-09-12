import type { Metadata } from "next";
import { HomePage } from "@/components/home-page";

export const metadata: Metadata = {
  title: {
    absolute: "Innovative Aegis | CareerMate, Manavya AI, Aurora AI",
  },
  description:
    "Innovative Aegis is a product house for intelligence. CareerMate is live. Manavya AI is coming. Aurora AI is a robotaxi model being cooked for Indian streets.",
  keywords: [
    "Innovative Aegis",
    "InnovateAegis",
    "CareerMate",
    "Manavya AI",
    "Aurora AI",
    "robotaxi India",
    "ATS resume builder",
    "AI software company India",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Innovative Aegis | a house of intelligence",
    description:
      "CareerMate is live. Manavya AI is coming. Aurora AI is being cooked for Indian streets.",
    url: "https://innovativeaegis.com",
    type: "website",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Innovative Aegis",
  alternateName: "InnovateAegis",
  url: "https://innovativeaegis.com",
  description:
    "Innovative Aegis builds CareerMate, Manavya AI, Aurora AI, Sentra, FaceNova, and SAI.",
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "CareerMate",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      url: "https://careermate.innovativeaegis.com/",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      description:
        "Free career operating system: ATS resume builder, Manavya review, interview coach, and application tracker. Formerly HYGYR.",
    },
    {
      "@type": "SoftwareApplication",
      name: "Manavya AI",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      description:
        "Coming AI model from Innovative Aegis, powered by the M2 intelligence engine.",
    },
    {
      "@type": "SoftwareApplication",
      name: "Aurora AI",
      applicationCategory: "AutomotiveApplication",
      operatingSystem: "Embedded",
      description:
        "Autonomous taxi model being cooked for driving on Indian streets.",
    },
  ],
};

export default function Home() {
  return (
    <>
      <HomePage />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
    </>
  );
}
