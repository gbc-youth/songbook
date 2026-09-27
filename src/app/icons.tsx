// Quiet, thin-stroke inline icons. No icon library: each is a tiny SVG using
// currentColor so it inherits text colour, with a 1.5px stroke to match the
// restrained sans UI. Size defaults to 22 (visually balanced inside a 44px tap target).

interface IconProps {
  size?: number;
  className?: string;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function BackIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function SearchIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </svg>
  );
}

export function SettingsIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2.4M12 18.1v2.4M4.9 6.5l1.7 1.7M17.4 15.8l1.7 1.7M3.5 12h2.4M18.1 12h2.4M4.9 17.5l1.7-1.7M17.4 8.2l1.7-1.7" />
    </svg>
  );
}

export function MinusIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function PlusIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ShareIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <path d="M12 3v12M8 7l4-4 4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

export function AddSquareIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

export function OpenAppIcon({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <rect x="6" y="3" width="12" height="18" rx="2.5" />
      <path d="M12 17.5v.01" />
    </svg>
  );
}

export function BookIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 0 4 23z" />
      <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 1 2.5 2z" />
    </svg>
  );
}

export function DownloadIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <path d="M12 4v11M7.5 11l4.5 4.5L16.5 11M5 19.5h14" />
    </svg>
  );
}

export function CheckIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function MoreIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <circle cx="5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} className={className} aria-hidden="true" {...base}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
