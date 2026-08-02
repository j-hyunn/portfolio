import { useEffect, useRef, useState } from 'react'

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null

/** mermaid는 번들이 커서 다이어그램이 실제로 있을 때만 지연 로드한다. */
function loadMermaid() {
  mermaidPromise ??= import('mermaid').then((mod) => {
    mod.default.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'strict',
      fontFamily: 'inherit',
    })
    return mod.default
  })
  return mermaidPromise
}

let idCounter = 0

export function Mermaid({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const id = `mermaid-${(idCounter += 1)}`

    loadMermaid()
      .then((mermaid) => mermaid.render(id, code))
      .then(({ svg }) => {
        if (cancelled || !containerRef.current) return
        containerRef.current.innerHTML = svg
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [code])

  if (failed) {
    return (
      <pre>
        <code>{code}</code>
      </pre>
    )
  }

  return (
    <div className="border-border my-6 overflow-x-auto rounded-xl border bg-white p-5">
      <div ref={containerRef} className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" />
    </div>
  )
}
