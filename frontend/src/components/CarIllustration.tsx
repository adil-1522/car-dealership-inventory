/** Decorative car silhouette used when a vehicle has no photo. */
export function CarIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 48" className={className} fill="none" aria-hidden="true">
      <path
        d="M8 34c0-4 2-7 6-8l14-3 12-10c3-2 6-3 10-3h22c4 0 7 1 10 4l9 9 15 3c4 1 6 4 6 8v4H8v-4z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M44 14h14v10H34l10-10zM62 14h14l8 10H62V14z" fill="#0b0f17" opacity="0.55" />
      <circle cx="32" cy="38" r="8" fill="#0b0f17" />
      <circle cx="32" cy="38" r="4" fill="currentColor" />
      <circle cx="92" cy="38" r="8" fill="#0b0f17" />
      <circle cx="92" cy="38" r="4" fill="currentColor" />
    </svg>
  );
}
