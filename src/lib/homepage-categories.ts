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
  {
    key: "painting",
    displayName: "Painting",
    tagline: "Fresh coat, fresh feel.",
    heroSubcopy: "See a room in a whole new colour before you buy a single tin of paint.",
  },
  {
    key: "roofing",
    displayName: "Roofing",
    tagline: "A roof that lasts and looks great.",
    heroSubcopy: "Cracked and weathered, or freshly re-roofed? Preview your roof's transformation from the street.",
  },
  {
    key: "flooring",
    displayName: "Flooring",
    tagline: "From tired floors to standout style.",
    heroSubcopy: "Upload a photo of the room and see it with brand new flooring — wood, tile, or carpet.",
  },
  {
    key: "living-room",
    displayName: "Living Room",
    tagline: "A space made for gathering.",
    heroSubcopy: "See your living room restyled with new seating, storage, and layout ideas.",
  },
  {
    key: "bedroom",
    displayName: "Bedroom",
    tagline: "Your calm, personal retreat.",
    heroSubcopy: "Turn a tired bedroom into the restful space you actually want to wake up in.",
  },
  {
    key: "kids-room",
    displayName: "Kids' Room",
    tagline: "Fun, functional, and made to grow with them.",
    heroSubcopy: "Preview a bright, playful redesign for your child's room before making any changes.",
  },
  {
    key: "extension",
    displayName: "Extension",
    tagline: "More space, seamlessly added.",
    heroSubcopy: "Visualise how a new extension could look on your actual home before speaking to an architect.",
  },
];

export function getHomepageCategory(key: string): HomepageCategory | undefined {
  return HOMEPAGE_CATEGORIES.find((c) => c.key === key);
}
