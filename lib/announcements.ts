export type Announcement = {
  id: string;
  eyebrow: string;
  title: string;
  href: string;
};

export const announcements: Announcement[] = [
  {
    id: "aurora",
    eyebrow: "Announcement",
    title: "Aurora AI — a robotaxi model being cooked for Indian streets",
    href: "/products/aurora-ai",
  },
  {
    id: "manavya",
    eyebrow: "Coming",
    title: "Manavya AI model — intelligence born of creation",
    href: "/products/manavya",
  },
  {
    id: "careermate",
    eyebrow: "Now live",
    title: "HYGYR is now CareerMate, a free career operating system",
    href: "/products/careermate",
  },
];
