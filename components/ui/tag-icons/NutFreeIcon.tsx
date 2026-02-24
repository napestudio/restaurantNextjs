interface NutFreeIconProps {
  size?: number;
  className?: string;
}

export function NutFreeIcon({ size = 16, className }: NutFreeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Nut/peanut shape */}
      <path d="M12 3C9.5 3 7 5 7 8c0 1.5.6 2.8 1.5 3.8C7.6 12.8 7 14.1 7 15.5 7 18.5 9.5 21 12 21s5-2.5 5-5.5c0-1.4-.6-2.7-1.5-3.7C16.4 10.8 17 9.5 17 8c0-3-2.5-5-5-5zm0 2c1.7 0 3 1.3 3 3s-1.3 3-3 3-3-1.3-3-3 1.3-3 3-3zm0 8c1.9 0 3 1.3 3 3.5S13.9 19 12 19s-3-1.3-3-3.5 1.1-3.5 3-3.5z" />
      {/* Strike-through line */}
      <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
