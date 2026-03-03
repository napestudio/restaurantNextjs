import { ChiliPath } from "./SpicyIcon";

interface SpicyHighIconProps {
  size?: number;
  className?: string;
}

// Three chili peppers — spicy high
// viewBox is 3× wide (192×64) so height={size} keeps proportions
export function SpicyHighIcon({ size = 16, className }: SpicyHighIconProps) {
  return (
    <svg
      width={size * 3}
      height={size}
      viewBox="0 0 192 64"
      fill="currentColor"
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(0, 0)">
        <ChiliPath />
      </g>
      <g transform="translate(64, 0)">
        <ChiliPath />
      </g>
      <g transform="translate(128, 0)">
        <ChiliPath />
      </g>
    </svg>
  );
}
