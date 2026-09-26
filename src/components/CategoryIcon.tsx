/** Minimal stroke icons for the homepage category grid — no icon library dependency for six shapes. */
export function CategoryIcon({ type, className }: { type: string; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (type) {
    case "kitchen":
      return (
        <svg {...common}>
          <path d="M4 3v18M4 8h5M4 13h5" />
          <circle cx="16" cy="8" r="4" />
          <path d="M13 21l3-5 3 5" />
        </svg>
      );
    case "bathroom":
      return (
        <svg {...common}>
          <path d="M3 12h18M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6M7 12V6a2 2 0 0 1 4 0" />
          <path d="M7 5.5V4" />
        </svg>
      );
    case "driveway":
      return (
        <svg {...common}>
          <path d="M3 17l1.5-6.5A2 2 0 0 1 6.5 9h11a2 2 0 0 1 2 1.5L21 17" />
          <path d="M3 17h18v2a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2Z" />
          <circle cx="7.5" cy="17" r="1" />
          <circle cx="16.5" cy="17" r="1" />
        </svg>
      );
    case "garden":
      return (
        <svg {...common}>
          <path d="M12 21V9" />
          <path d="M12 9C12 9 6 9 6 4.5C10.5 4.5 12 9 12 9Z" />
          <path d="M12 13C12 13 18 13 18 8.5C13.5 8.5 12 13 12 13Z" />
        </svg>
      );
    case "patio":
      return (
        <svg {...common}>
          <path d="M4 21V11l8-6 8 6v10" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );
    case "exterior":
      return (
        <svg {...common}>
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}
