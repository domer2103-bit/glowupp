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
    case "painting":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="6" rx="2" />
          <rect x="10.5" y="10" width="3" height="3" rx="0.5" />
          <rect x="10.7" y="12.5" width="2.6" height="9" rx="1.3" transform="rotate(12 12 17)" />
        </svg>
      );
    case "roofing":
      return (
        <svg {...common}>
          <path d="M2 14 12 5 22 14H19V17H5V14Z" />
          <rect x="15.5" y="7" width="2.2" height="5" />
        </svg>
      );
    case "flooring":
      return (
        <svg {...common}>
          <rect x="3" y="5.5" width="18" height="3.4" rx="0.7" />
          <rect x="3" y="10.3" width="18" height="3.4" rx="0.7" />
          <rect x="3" y="15.1" width="18" height="3.4" rx="0.7" />
        </svg>
      );
    case "living-room":
      return (
        <svg {...common}>
          <rect x="3" y="6.5" width="4" height="6.5" rx="1.5" />
          <rect x="17" y="6.5" width="4" height="6.5" rx="1.5" />
          <rect x="6.3" y="7" width="11.4" height="6" rx="1.2" />
          <rect x="3" y="10.5" width="18" height="5.5" rx="1.5" />
          <rect x="4" y="16.5" width="2" height="3" rx="0.6" />
          <rect x="18" y="16.5" width="2" height="3" rx="0.6" />
        </svg>
      );
    case "bedroom":
      return (
        <svg {...common}>
          <rect x="2" y="7.5" width="20" height="2" rx="1" />
          <rect x="2.5" y="9.5" width="5" height="5" rx="1.3" />
          <rect x="2.5" y="12.5" width="19" height="6.5" rx="1.5" />
          <rect x="2" y="18.5" width="1.6" height="3" rx="0.5" />
          <rect x="20.4" y="18.5" width="1.6" height="3" rx="0.5" />
        </svg>
      );
    case "kids-room":
      return (
        <svg {...common}>
          <rect x="7" y="4.5" width="7" height="7" rx="1.2" />
          <rect x="3" y="12.5" width="7" height="7" rx="1.2" />
          <rect x="11" y="12.5" width="7" height="7" rx="1.2" />
        </svg>
      );
    case "extension":
      return (
        <svg {...common}>
          <path d="M15 2.5 22 8 22 19.5 11 19.5 11 8Z" />
          <rect x="3" y="12.5" width="7" height="7" />
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
