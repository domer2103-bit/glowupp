/**
 * Marketing copy for the homepage's category grid and each /redesign/[type]
 * landing page — deliberately kept separate from src/lib/project-types.ts
 * (which drives the actual project-creation form fields) since this is
 * pure homepage content, not anything the generation pipeline reads.
 * Every key here must exist in PROJECT_TYPES — validated where it's used.
 */
export interface HomepageCategory {
  key: string;
  displayName: string;
  tagline: string;
  heroSubcopy: string;
}

export const HOMEPAGE_CATEGORIES: readonly HomepageCategory[] = [
  {
    key: "kitchen",
    displayName: "Kitchen",
    tagline: "Modern, functional, beautiful.",
    heroSubcopy: "Upload a photo of your kitchen and see it redesigned — new cabinets, worktops, and layout ideas in seconds.",
  },
  {
    key: "bathroom",
    displayName: "Bathroom",
    tagline: "Relax. Recharge. Reimagine.",
    heroSubcopy: "From tired tiles to a spa-like retreat — see your bathroom's potential before you touch a single fixture.",
  },
  {
    key: "driveway",
    displayName: "Driveway",
    tagline: "Better looks. Higher value.",
    heroSubcopy: "Cracked and patchy, or smart and resurfaced? See your driveway both ways before deciding.",
  },
  {
    key: "garden",
    displayName: "Garden",
    tagline: "More green. More you.",
    heroSubcopy: "Turn an overgrown or empty garden into the outdoor space you've been picturing.",
  },
  {
    key: "patio",
    displayName: "Patio",
    tagline: "Your outdoor living space.",
    heroSubcopy: "See your patio reimagined for actual living — seating, lighting, and a finish that fits your home.",
  },
  {
    key: "exterior",
    displayName: "Exterior",
    tagline: "Make a lasting first impression.",
    heroSubcopy: "A new front door, render, or finish can transform how your whole home reads from the street.",
  },
];

export function getHomepageCategory(key: string): HomepageCategory | undefined {
  return HOMEPAGE_CATEGORIES.find((c) => c.key === key);
}
