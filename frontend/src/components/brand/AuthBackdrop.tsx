export function AuthBackdrop() {
  return (
    <div
      aria-hidden="true"
      // overflow-hidden contains the scaled aurora blobs on small viewports.
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-bg" />
      <div className="absolute inset-0 bg-aurora-1 animate-aurora-1" />
      <div className="absolute inset-0 bg-aurora-2 animate-aurora-2" />
      <div className="absolute inset-0 bg-aurora-3 animate-aurora-3" />
      <div className="absolute inset-0 bg-grid-fine bg-[length:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(10,10,15,0.85)_85%)]" />
      <div className="absolute inset-0 noise" />
    </div>
  )
}
