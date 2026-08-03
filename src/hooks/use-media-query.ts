import * as React from 'react'

// SSR/초기 렌더에서는 false로 시작하고, 마운트 후 실제 매치 값으로 맞춘다.
export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const update = () => setMatches(mql.matches)

    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [query])

  return matches
}

// Tailwind의 md(48rem) 미만을 모바일로 본다.
export function useIsMobile() {
  return useMediaQuery('(max-width: 47.999rem)')
}
