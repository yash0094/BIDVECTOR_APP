export function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#16a34a" />
      <path d="M32 16 L48 42 L16 42 Z" fill="#ffffff" />
    </svg>
  )
}

export function Logo({ size = 40, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {wordmark && (
        <span className="font-semibold tracking-tight text-ink-900" style={{ fontSize: size * 0.42 }}>
          BidVector
        </span>
      )}
    </div>
  )
}
