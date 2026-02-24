import { ChiliPath } from "./SpicyIcon";

interface SpicyMediumIconProps {
  size?: number;
  className?: string;
}

// Two chili peppers — spicy medium
// viewBox is 2× wide (128×64) so height={size} keeps proportions
export function SpicyMediumIcon({ size = 16, className }: SpicyMediumIconProps) {
  return (
    <svg
      width={size * 2}
      height={size}
      viewBox="0 0 128 64"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(0, 0)">
        <ChiliPath />
      </g>
      <g transform="translate(64, 0)">
        <ChiliPath />
      </g>
    </svg>
  );
}
