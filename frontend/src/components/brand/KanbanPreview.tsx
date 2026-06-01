import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface Card {
  id: string
  title: string
  tag?: { label: string; color: string }
  assignee?: string
}

interface ColumnData {
  id: 'todo' | 'doing' | 'done'
  name: string
  count: number
  cards: Card[]
}

const initial: ColumnData[] = [
  {
    id: 'todo',
    name: 'To do',
    count: 3,
    cards: [
      { id: 'c1', title: 'Design empty states', tag: { label: 'UI', color: 'cyan' } },
      { id: 'c2', title: 'Add timezone support', tag: { label: 'API', color: 'magenta' } },
      { id: 'c3', title: 'Write changelog' },
    ],
  },
  {
    id: 'doing',
    name: 'In progress',
    count: 2,
    cards: [
      { id: 'c4', title: 'Implement drag & drop', tag: { label: 'core', color: 'purple' }, assignee: 'AM' },
      { id: 'c5', title: 'Wire real-time sockets', tag: { label: 'core', color: 'purple' }, assignee: 'SD' },
    ],
  },
  {
    id: 'done',
    name: 'Done',
    count: 2,
    cards: [
      { id: 'c6', title: 'Auth with JWT rotation', tag: { label: 'shipped', color: 'green' } },
      { id: 'c7', title: 'Prisma schema', tag: { label: 'shipped', color: 'green' } },
    ],
  },
]

const tagColors: Record<string, string> = {
  cyan: 'bg-cyan-glow/15 text-cyan-glow border-cyan-glow/30',
  magenta: 'bg-magenta-glow/15 text-magenta-glow border-magenta-glow/30',
  purple: 'bg-accent/20 text-accent-glow border-accent/30',
  green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
}

export function KanbanPreview() {
  const [columns, setColumns] = useState<ColumnData[]>(initial)

  useEffect(() => {
    const interval = setInterval(() => {
      setColumns((prev) => {
        const next = prev.map((c) => ({ ...c, cards: [...c.cards] }))
        const doing = next.find((c) => c.id === 'doing')!
        const done = next.find((c) => c.id === 'done')!
        const todo = next.find((c) => c.id === 'todo')!

        // Move first doing card to done, and pull a todo card into doing
        if (doing.cards.length > 0) {
          const moved = doing.cards.shift()!
          done.cards.unshift({
            ...moved,
            tag: { label: 'shipped', color: 'green' },
          })
          // Trim done to keep size manageable
          if (done.cards.length > 3) done.cards.pop()
        }
        if (todo.cards.length > 0 && doing.cards.length < 2) {
          const promoted = todo.cards.shift()!
          doing.cards.push({
            ...promoted,
            tag: { label: 'core', color: 'purple' },
            assignee: 'AM',
          })
        }
        // Recycle: add a fresh card to "todo" so it never empties
        if (todo.cards.length < 3) {
          const fresh: Card = {
            id: `r-${Date.now()}`,
            title: pickFreshTitle(),
            tag: { label: 'idea', color: 'cyan' },
          }
          todo.cards.push(fresh)
        }
        next.forEach((c) => (c.count = c.cards.length))
        return next
      })
    }, 3200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-aurora-1 blur-3xl opacity-50" />
      <div className="relative grid grid-cols-3 gap-3">
        {columns.map((col, colIdx) => (
          <Column key={col.id} data={col} delay={colIdx * 0.08} />
        ))}
      </div>
    </div>
  )
}

function Column({ data, delay }: { data: ColumnData; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      className="glass rounded-xl p-3 min-h-[280px]"
    >
      <header className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">
          {data.name}
        </span>
        <span className="text-[10px] text-ink-subtle font-mono">{data.count}</span>
      </header>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {data.cards.map((card) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 6 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="rounded-lg bg-bg-surface/90 border border-bg-border p-2.5 text-[12px] leading-snug shadow-card"
            >
              <p className="text-ink mb-1.5 line-clamp-2">{card.title}</p>
              <div className="flex items-center justify-between">
                {card.tag ? (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${
                      tagColors[card.tag.color] ?? tagColors.purple
                    }`}
                  >
                    {card.tag.label}
                  </span>
                ) : (
                  <span />
                )}
                {card.assignee && (
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent to-cyan-glow grid place-items-center text-[9px] font-semibold text-bg">
                    {card.assignee}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

const FRESH_TITLES = [
  'Add board templates',
  'Export to Markdown',
  'Bulk-archive cards',
  'Per-column WIP limits',
  'Card mentions @user',
  'Activity digest email',
  'Keyboard shortcuts (?)',
]
let titleIdx = 0
function pickFreshTitle(): string {
  const t = FRESH_TITLES[titleIdx % FRESH_TITLES.length]
  titleIdx++
  return t
}
