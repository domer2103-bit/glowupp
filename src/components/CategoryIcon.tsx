/** Solid flat icons for the homepage category grid, matching the approved mockup's icon style — no icon library dependency for six shapes. */
export function CategoryIcon({ type, className }: { type: string; className?: string }) {
  const common = { className, viewBox: "0 0 24 24", fill: "currentColor", stroke: "none" };

  switch (type) {
    case "kitchen":
      return (
        <svg {...common}>
          <circle cx="12" cy="3.6" r="1.1" />
          <rect x="5" y="6" width="14" height="1.8" rx="0.9" />
          <rect x="2.3" y="9.2" width="3.2" height="2.2" rx="1.1" />
          <rect x="18.5" y="9.2" width="3.2" height="2.2" rx="1.1" />
          <path d="M4.3 9.5h15.4l-1.4 8.6a2.2 2.2 0 0 1-2.2 1.85H7.9a2.2 2.2 0 0 1-2.2-1.85L4.3 9.5Z" />
        </svg>
      );
    case "bathroom":
      return (
        <svg {...common}>
          <path d="M12 2.2c-.35.45-1.1 1.45-1.9 2.75C8.4 7.5 6.3 11 6.3 14.2a5.7 5.7 0 0 0 11.4 0c0-3.2-2.1-6.7-3.8-9.25C13.1 3.65 12.35 2.65 12 2.2Z" />
        </svg>
      );
    case "driveway":
      return (
        <svg {...common}>
          <path d="M4 17a1 1 0 0 1-1-1v-1.5a2 2 0 0 1 1.5-1.94l.9-3.15A2.5 2.5 0 0 1 7.8 7.6h8.4a2.5 2.5 0 0 1 2.4 1.81l.9 3.15A2 2 0 0 1 21 14.5V16a1 1 0 0 1-1 1h-1v.5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1V17H8v.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V17H4Z" />
        </svg>
      );
    case "garden":
      return (
        <svg {...common}>
          <path d="M11 20a7 7 0 0 1-1.2-13.9C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M12.6 12.4c-2.2 1.4-3.6 3.3-4.1 5.9l-1.5-.3c.55-2.9 2.1-5.05 4.6-6.6l1 1Z" />
        </svg>
      );
    case "patio":
      return (
        <svg {...common}>
          <path d="M6 12V8a2.5 2.5 0 0 1 2.5-2.5h7A2.5 2.5 0 0 1 18 8v4" />
          <rect x="4.5" y="11.5" width="15" height="5" rx="1.5" />
          <rect x="5" y="16.5" width="2" height="3" rx="0.6" />
          <rect x="17" y="16.5" width="2" height="3" rx="0.6" />
        </svg>
      );
    case "exterior":
      return (
        <svg {...common}>
          <path d="M12 2.5 21.5 10 21.5 20.5 14.5 20.5 14.5 13.5 9.5 13.5 9.5 20.5 2.5 20.5 2.5 10Z" />
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
