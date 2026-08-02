import type { ReactNode } from 'react'

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2.5 text-xs font-medium tracking-wider text-blue-600 uppercase">
      <span className="h-px w-5 bg-blue-400" />
      {children}
    </p>
  )
}

export function CaseSection({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string
  eyebrow: string
  title: string
  lead?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="border-border mt-14 border-t pt-10">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-2xl font-bold tracking-tight">{title}</h2>
      {lead && <p className="text-muted-foreground mt-2 max-w-2xl">{lead}</p>}
      {children}
    </section>
  )
}

export function Arrow({ tone = 'muted' }: { tone?: 'muted' | 'accent' }) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 text-sm ${tone === 'accent' ? 'text-blue-400' : 'text-muted-foreground/50'}`}
    >
      →
    </span>
  )
}

export function MetaRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="border-border mt-8 space-y-4 border-t pt-6">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-y-1 sm:grid-cols-[92px_1fr] sm:gap-x-6">
          <dt className="text-muted-foreground text-xs tracking-wide">{row.label}</dt>
          <dd className="text-muted-foreground text-sm">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
