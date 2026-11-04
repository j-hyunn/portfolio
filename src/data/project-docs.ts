const replaiModules = import.meta.glob('../content/replai/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const playballModules = import.meta.glob('../content/playball/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function toSlugMap(modules: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(modules).map(([path, source]) => [
      path.split('/').pop()!.replace(/\.md$/, ''),
      source,
    ]),
  )
}

/** 옵시디언 위키링크 표기 → 포트폴리오 문서 slug (프로젝트별) */
const wikiTargetToSlug: Record<string, Record<string, string>> = {
  replai: {
    prd: 'prd',
    trd: 'trd',
    'multi agent architecture': 'multi-agent-architecture',
    'multi-agent architecture': 'multi-agent-architecture',
    'agents prompt': 'agents-prompt',
    '경쟁사 분석': 'competitor-analysis',
    '기술 선택 근거 요약': 'tech-decisions',
  },
  playball: {
    // 제품 문서
    prd: 'prd',
    brd: 'brd',
    // 기능 명세 — 원문에 가운뎃점/마침표/언더스코어 표기가 섞여 있어 별칭을 함께 둔다.
    '로그인.회원가입': 'auth',
    '로그인·회원가입': 'auth',
    '온보딩': 'onboarding',
    '구단.경기 상세페이지': 'match-detail',
    '구단·경기 상세페이지': 'match-detail',
    '티켓 예매': 'ticketing',
    '추천블럭 계산 가이드': 'block-recommendation',
    '주문서 및 결제': 'order-payment',
    '주문서_및_결제': 'order-payment',
    '마이페이지': 'mypage',
    // 운영 · 정책
    '회원 접근 정책': 'access-policy',
    '회원_비회원 기능 구분': 'access-policy',
    '대기열 정책': 'queue-policy',
    'vqa 정책': 'vqa-policy',
    '추천 정책': 'recommendation-policy',
    '취소.환불 정책': 'cancellation-policy',
    '취소·환불 정책': 'cancellation-policy',
    '경기장 템플릿': 'stadium-template',
    '비즈니스 지표': 'business-metrics',
    '부하테스트 시나리오': 'load-test',
    'staging test case': 'staging-test-case',
    // 약관
    '이용 약관': 'terms',
    '개인정보 처리방침': 'privacy',
  },
}

/**
 * 실재하지 않는 문서. 참조 목록에서 해당 줄을 통째로 제거한다.
 * 키는 `[[...]]` 안의 원문 전체와 정확히 일치해야 한다 (경로 표기 포함).
 */
const missingDocs: Record<string, string[]> = {
  replai: [
    'Micro Projects/Replai/Decisions',
    'Micro Projects/Replai/문제와 솔루션',
    'Micro Projects/Replai/타겟 유저',
    'Micro Projects/Replai/비즈니스 모델',
    '서비스 소개서',
  ],
  playball: ['기능 정책서'],
}

/** `- [[문서]] — 설명` 형태의 참조 줄을 제거한다. */
function dropMissingRefs(markdown: string, projectSlug: string): string {
  const targets = missingDocs[projectSlug]
  if (!targets?.length) return markdown
  return markdown
    .split('\n')
    .filter((line) => {
      const isListItem = /^\s*[-*]\s/.test(line)
      return !(isListItem && targets.some((name) => line.includes(`[[${name}]]`)))
    })
    .join('\n')
}

/**
 * 옵시디언·AI 편집기 문법을 정리한다.
 * - `![[image.png]]` 임베드는 포트폴리오에 자산이 없으므로 제거
 * - 실재하지 않는 문서를 가리키는 참조 줄은 제거
 * - AI 대화 내보내기에서 남은 claude.ai 목차 링크는 라벨 텍스트만 남김
 * - `[[문서]]` 링크는 포트폴리오에 있으면 내부 링크로, 없으면 제목 텍스트만 남김
 */
function normalizeObsidian(markdown: string, projectSlug: string): string {
  const map = wikiTargetToSlug[projectSlug] ?? {}
  return dropMissingRefs(markdown, projectSlug)
    .replace(/!\[\[[^\]]+\]\]/g, '')
    .replace(/\[([^\]]+)\]\(https:\/\/claude\.ai\/chat\/[^)]*\)/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, (_match, raw: string) => {
      const [target, alias] = raw.split('|')
      const label = (alias ?? target.split('/').pop() ?? target).trim()
      const key = (target.split('/').pop() ?? target).trim().toLowerCase()
      const slug = map[key]
      return slug ? `[${label}](/projects/${projectSlug}/${slug})` : label
    })
}

const sourcesByProject: Record<string, Record<string, string>> = {
  replai: toSlugMap(replaiModules),
  playball: toSlugMap(playballModules),
}

/** `${projectSlug}/${docSlug}` → 렌더링용 마크다운 */
export const markdownDocs: Record<string, string> = Object.fromEntries(
  Object.entries(sourcesByProject).flatMap(([projectSlug, docs]) =>
    Object.entries(docs).map(([docSlug, source]) => [
      `${projectSlug}/${docSlug}`,
      normalizeObsidian(source, projectSlug),
    ]),
  ),
)
