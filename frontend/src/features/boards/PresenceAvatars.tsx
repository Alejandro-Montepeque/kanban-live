import type { PresenceUser } from '@/api/socket-events'
import { useAuthStore } from '@/stores/auth'

interface Props {
  users: PresenceUser[]
  connected: boolean
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('') || '·'
  )
}

export function PresenceAvatars({ users, connected }: Props) {
  const me = useAuthStore((s) => s.user)
  // Put me first if present, then others.
  const ordered = [...users].sort((a, b) => {
    if (a.userId === me?.id) return -1
    if (b.userId === me?.id) return 1
    return 0
  })

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-surface border border-bg-border text-[10px]"
        title={connected ? 'Connected to realtime' : 'Offline'}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            connected ? 'bg-emerald-400 animate-pulse' : 'bg-ink-subtle'
          }`}
        />
        <span className="text-ink-muted">
          {connected ? `${ordered.length} live` : 'offline'}
        </span>
      </div>
      <div className="flex items-center -space-x-2">
        {ordered.slice(0, 5).map((u) => (
          <div
            key={u.userId}
            title={u.userId === me?.id ? `${u.name} (you)` : u.name}
            className={`w-7 h-7 rounded-full bg-gradient-to-br from-accent to-cyan-glow grid place-items-center text-[10px] font-bold text-bg ring-2 ${
              u.userId === me?.id ? 'ring-accent-glow' : 'ring-bg-card'
            }`}
          >
            {initials(u.name)}
          </div>
        ))}
        {ordered.length > 5 && (
          <div className="w-7 h-7 rounded-full bg-bg-surface grid place-items-center text-[10px] font-bold text-ink-muted ring-2 ring-bg-card">
            +{ordered.length - 5}
          </div>
        )}
      </div>
    </div>
  )
}
