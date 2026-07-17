export const AppLogo = ({ className = '' }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="6"
      y="6"
      width="52"
      height="52"
      rx="14"
      stroke="#ffffff"
      strokeWidth="5"
    />

    <path
      d="M32 32 20.5 20.5M32 32 43.5 20.5M32 32 20.5 43.5M32 32 43.5 43.5"
      stroke="#38bdf8"
      strokeWidth="3.5"
      strokeLinecap="round"
    />

    <circle
      cx="32"
      cy="32"
      r="6"
      fill="#38bdf8"
    />

    <circle
      cx="20.5"
      cy="20.5"
      r="4"
      fill="#7dd3fc"
    />

    <circle
      cx="43.5"
      cy="20.5"
      r="4"
      fill="#7dd3fc"
    />

    <circle
      cx="20.5"
      cy="43.5"
      r="4"
      fill="#7dd3fc"
    />

    <circle
      cx="43.5"
      cy="43.5"
      r="4"
      fill="#7dd3fc"
    />
  </svg>
)
