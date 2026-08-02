const builders = [
  { name: 'feature-builder', role: 'Next.js UI · 로직' },
  { name: 'db-agent', role: '스키마 · RLS · 쿼리' },
  { name: 'ai-builder', role: 'ADK · 프롬프트' },
]

export function ReplaiDevHarness() {
  return (
    <article>
      <p className="flex items-center gap-2.5 text-xs font-medium tracking-wider text-blue-600 uppercase">
        <span className="h-px w-5 bg-blue-400" />
        산출물
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">개발 하네스 에이전트 팀</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        제품 안의 AI와 별개로, 개발을 위해 에이전트 팀을 오케스트레이션했다. PM 에이전트가 스펙을
        잡고, 빌더들이 병렬로 구현하고, QA가 검증한다.
      </p>

      <div className="border-border mt-8 space-y-3 rounded-xl border p-5">
        <div className="mx-auto max-w-xs rounded-lg bg-blue-50 px-4 py-3 text-center ring-1 ring-blue-100">
          <p className="text-sm font-medium text-blue-900">pm-agent</p>
          <p className="mt-0.5 text-xs text-blue-800/70">아이디어 → 개발 스펙</p>
        </div>

        <p className="text-muted-foreground text-center text-xs">↓ 병렬 실행</p>

        <div className="grid gap-2 sm:grid-cols-3">
          {builders.map((builder) => (
            <div key={builder.name} className="rounded-lg bg-violet-50 px-3.5 py-3 text-center">
              <p className="text-sm font-medium text-violet-900">{builder.name}</p>
              <p className="mt-0.5 text-xs text-violet-800/80">{builder.role}</p>
            </div>
          ))}
        </div>

        <p className="text-muted-foreground text-center text-xs">↓</p>

        <div className="bg-secondary mx-auto max-w-xs rounded-lg px-4 py-3 text-center">
          <p className="text-sm font-medium">qa-agent</p>
          <p className="text-muted-foreground mt-0.5 text-xs">타입·보안·컨벤션 검증</p>
        </div>
      </div>
    </article>
  )
}
