interface DairyFreeIconProps {
  size?: number;
  className?: string;
}

export function DairyFreeIcon({ size = 16, className }: DairyFreeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Milk glass */}
      <path d="M6 2l1.5 4H7l1 14h8l1-14h-.5L18 2H6zm2.27 2h7.46l-1 2.67H9.27L8.27 4zM9 9h6v1H9V9zm-.5 3h7l-.5 7H9l-.5-7z" />
      {/* Strike-through line */}
      <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
