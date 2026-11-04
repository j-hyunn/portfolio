#!/usr/bin/env node
/**
 * 포트폴리오 데이터 경계면 정합성 검사.
 *
 * 빌드와 tsc가 통과시켜 버리는 "짝이 안 맞는" 결함을 잡는다:
 *  1) projects.ts 의 docs slug ↔ src/content 의 .md 파일 (양방향)
 *  2) src/content 의 프로젝트 폴더 ↔ project-docs.ts 의 glob / sourcesByProject 등록
 *  3) 문서의 [[위키링크]] ↔ wikiTargetToSlug / missingDocs 매핑
 *  4) wikiTargetToSlug 의 값 ↔ 실존하는 문서 slug (죽은 매핑)
 *  5) ProjectDetail.tsx 의 customDocs(컴포넌트 렌더 문서) ↔ 메뉴 등록 (양방향)
 *  6) missingDocs 제거 후 빈 섹션(제목만 남음)이 생기는지
 *
 * 사용법: 저장소 루트에서
 *   node .claude/skills/verify-portfolio/scripts/check-integrity.mjs
 * 종료 코드: 결함 0건이면 0, 1건 이상이면 1
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DATA = join(ROOT, 'src/data')
const CONTENT = join(ROOT, 'src/content')
const findings = []
const add = (severity, boundary, where, message) =>
  findings.push({ severity, boundary, where, message })

if (!existsSync(join(DATA, 'projects.ts'))) {
  console.error('src/data/projects.ts 를 찾을 수 없다. 저장소 루트에서 실행하라.')
  process.exit(2)
}

/* ---------- projects.ts 를 실제로 평가해 데이터를 얻는다 ---------- */
// 정규식 파싱은 중첩 배열(docs/docGroups)에서 쉽게 틀리므로, 타입만 떼고 실행한다.
// projects.ts 는 외부 import 가 없어 그대로 평가할 수 있다.
async function loadProjects() {
  const source = readFileSync(join(DATA, 'projects.ts'), 'utf8')
  let code
  try {
    const { transformSync } = await import(join(ROOT, 'node_modules/esbuild/lib/main.js'))
    code = transformSync(source, { loader: 'ts', format: 'esm' }).code
  } catch {
    // esbuild 가 없으면 타입 선언과 함수만 제거하는 최소 처리로 시도한다.
    code = source
      .replace(/export type [\s\S]*?\n}\n/g, '')
      .replace(/export function [\s\S]*?\n}\n/g, '')
      .replace(/:\s*ProjectEntry\[\]/g, '')
  }
  const mod = await import(
    'data:text/javascript;base64,' + Buffer.from(code, 'utf8').toString('base64')
  )
  if (!Array.isArray(mod.projects)) throw new Error('projects 배열을 읽지 못했다')
  return mod.projects
}

let projects
try {
  projects = await loadProjects()
} catch (error) {
  console.error('projects.ts 파싱 실패:', error.message)
  console.error('이 실패는 코드 결함이 아니라 검사 스크립트의 한계일 수 있다. 수동 검증으로 대체하라.')
  process.exit(2)
}

const docsOf = (p) => [...(p.docs ?? []), ...(p.docGroups ?? []).flatMap((g) => g.docs ?? [])]

/* ---------- src/content 실제 파일 목록 ---------- */
const contentDirs = existsSync(CONTENT)
  ? readdirSync(CONTENT).filter((n) => statSync(join(CONTENT, n)).isDirectory())
  : []
const filesByProject = Object.fromEntries(
  contentDirs.map((dir) => [
    dir,
    readdirSync(join(CONTENT, dir))
      .filter((n) => n.endsWith('.md'))
      .map((n) => n.replace(/\.md$/, '')),
  ]),
)

/* ---------- project-docs.ts 등록 상태 ---------- */
const pdSource = existsSync(join(DATA, 'project-docs.ts'))
  ? readFileSync(join(DATA, 'project-docs.ts'), 'utf8')
  : ''
const globbed = [...pdSource.matchAll(/import\.meta\.glob\(\s*['"]\.\.\/content\/([^/'"]+)\/\*\.md['"]/g)].map(
  (m) => m[1],
)
const sourcesBlock = pdSource.match(/sourcesByProject[^=]*=\s*{([\s\S]*?)\n}/)?.[1] ?? ''
const registered = [...sourcesBlock.matchAll(/^\s*([A-Za-z0-9_-]+)\s*:/gm)].map((m) => m[1])

/** wikiTargetToSlug / missingDocs 를 프로젝트별로 거칠게 파싱한다. */
function parseNestedMap(name) {
  const block = pdSource.match(new RegExp(`${name}[^=]*=\\s*{([\\s\\S]*?)\\n}\\n`))?.[1] ?? ''
  const result = {}
  // 블록의 마지막 항목에는 뒤따르는 개행이 없으므로 종료를 lookahead 로 본다.
  const re = /([A-Za-z0-9_-]+)\s*:\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*,?\s*(?=\n|$)/g
  for (const m of block.matchAll(re)) {
    const body = m[2]
    if (body.startsWith('{')) {
      result[m[1]] = Object.fromEntries(
        [...body.matchAll(/['"]?([^'":{}\n]+?)['"]?\s*:\s*['"]([^'"]+)['"]/g)].map((e) => [
          e[1].trim().toLowerCase(),
          e[2],
        ]),
      )
    } else {
      // missingDocs 는 런타임에서 `[[원문]]` 전체로 매칭하므로 대소문자를 보존한다.
      result[m[1]] = [...body.matchAll(/['"]([^'"]+)['"]/g)].map((e) => e[1])
    }
  }
  return result
}
const wikiMap = parseNestedMap('wikiTargetToSlug')
const missingMap = parseNestedMap('missingDocs')

/* ---------- 컴포넌트로 직접 렌더하는 문서 (customDocs) ---------- */
// 마크다운이 아니라 React 컴포넌트로 본문을 만드는 문서가 있다.
// 이 키에 해당하는 docs slug 는 .md 파일이 없어도 정상이다.
const detailPage = join(ROOT, 'src/pages/ProjectDetail.tsx')
const customBlock = existsSync(detailPage)
  ? (readFileSync(detailPage, 'utf8').match(/customDocs[\s\S]{0,200}?=\s*{([\s\S]*?)\n}/)?.[1] ?? '')
  : ''
const customKeys = [...customBlock.matchAll(/['"]([^'"]+)['"]\s*:/g)].map((m) => m[1])

/* ---------- 1) docs slug ↔ 문서 파일 (양방향) ---------- */
for (const project of projects) {
  const files = filesByProject[project.slug]
  if (!files) {
    add('blocker', 'projects.ts ↔ src/content', `projects.ts: ${project.slug}`,
      `문서 폴더 src/content/${project.slug}/ 가 없다`)
    continue
  }
  const declared = docsOf(project)
  for (const doc of declared) {
    const isCustom = customKeys.includes(`${project.slug}/${doc.slug}`)
    if (!files.includes(doc.slug) && !isCustom) {
      add('blocker', 'docs slug ↔ 문서 파일', `projects.ts: ${project.slug}/${doc.slug}`,
        `메뉴에 등록됐지만 src/content/${project.slug}/${doc.slug}.md 도 customDocs 항목도 없다 (빈 문서 페이지)`)
    }
  }
  const declaredSlugs = new Set(declared.map((d) => d.slug))
  for (const file of files) {
    if (!declaredSlugs.has(file)) {
      add('major', '문서 파일 ↔ docs slug', `src/content/${project.slug}/${file}.md`,
        '파일은 있지만 projects.ts 메뉴에 등록되지 않았다 (메뉴에서 접근 불가)')
    }
  }
}

/* ---------- 1-b) customDocs ↔ 메뉴 등록 ---------- */
const allDeclaredKeys = new Set(
  projects.flatMap((p) => docsOf(p).map((d) => `${p.slug}/${d.slug}`)),
)
for (const key of customKeys) {
  if (!allDeclaredKeys.has(key)) {
    add('major', 'customDocs ↔ docs slug', `ProjectDetail.tsx: ${key}`,
      'customDocs 에 있지만 projects.ts 메뉴에 등록되지 않았다 (메뉴에서 접근 불가)')
  }
}

/* ---------- 2) 프로젝트 폴더 ↔ glob / sourcesByProject ---------- */
for (const dir of contentDirs) {
  if (!globbed.includes(dir)) {
    add('blocker', 'content 폴더 ↔ import.meta.glob', `project-docs.ts`,
      `src/content/${dir}/ 에 대한 import.meta.glob 블록이 없다 (문서 본문이 전부 빈다)`)
  }
  if (!registered.includes(dir)) {
    add('blocker', 'content 폴더 ↔ sourcesByProject', `project-docs.ts`,
      `sourcesByProject 에 ${dir} 키가 없다 (markdownDocs 에 문서가 실리지 않는다)`)
  }
}
for (const dir of globbed) {
  if (!contentDirs.includes(dir)) {
    add('minor', 'import.meta.glob ↔ content 폴더', 'project-docs.ts',
      `glob 이 가리키는 src/content/${dir}/ 폴더가 없다 (죽은 glob)`)
  }
}

/* ---------- 3) 위키링크 ↔ 매핑 ---------- */
for (const [dir, files] of Object.entries(filesByProject)) {
  const map = wikiMap[dir] ?? {}
  const missing = missingMap[dir] ?? []
  for (const file of files) {
    const lines = readFileSync(join(CONTENT, dir, `${file}.md`), 'utf8').split('\n')
    lines.forEach((line, index) => {
      for (const [, bang, raw] of line.matchAll(/(!?)\[\[([^\]]+)\]\]/g)) {
        if (bang) continue // 이미지 임베드는 정규화 단계에서 제거된다
        const target = raw.split('|')[0]
        // 런타임 규칙: wikiTargetToSlug 는 소문자화한 마지막 경로 조각으로 조회하고,
        // missingDocs 는 대괄호 안 원문 전체로 매칭한다. 두 규칙을 섞으면 오탐이 난다.
        const key = (target.split('/').pop() ?? target).trim().toLowerCase()
        if (map[key]) continue
        if (missing.includes(target)) continue // 의도적으로 이식하지 않은 문서
        const where = `src/content/${dir}/${file}.md:${index + 1}`
        const targetExists = files.includes(key)
        if (targetExists) {
          add('major', '위키링크 ↔ wikiTargetToSlug', where,
            `[[${target}]] 의 대상 문서(${key}.md)는 있는데 매핑이 없다 → wikiTargetToSlug 에 '${key}': '${key}' 추가`)
        } else {
          add('minor', '위키링크 ↔ missingDocs', where,
            `[[${target}]] 는 이식하지 않은 문서인데 missingDocs 에 선언되지 않았다 (링크가 평문으로 죽고, 참조 줄이 남는다)`)
        }
      }
    })
  }
}

/* ---------- 3-b) missingDocs 제거 후 빈 섹션이 남는가 ---------- */
// 참조 줄이 통째로 제거되므로, 한 섹션의 항목이 전부 제거되면 제목만 남는다.
// 줄이 실제로 제거된 섹션만 본다 — 제목 바로 아래 하위 제목이 오는 구조는 정상이다.
const HEADING = /^#{1,6}\s/
for (const [dir, files] of Object.entries(filesByProject)) {
  const missing = missingMap[dir] ?? []
  if (missing.length === 0) continue
  for (const file of files) {
    const lines = readFileSync(join(CONTENT, dir, `${file}.md`), 'utf8').split('\n')
    const removed = lines.map(
      (line) =>
        /^\s*[-*]\s/.test(line) && missing.some((name) => line.includes(`[[${name}]]`)),
    )
    lines.forEach((line, index) => {
      if (!HEADING.test(line)) return
      let sawRemoval = false
      let sawContent = false
      for (let i = index + 1; i < lines.length && !HEADING.test(lines[i]); i += 1) {
        if (removed[i]) sawRemoval = true
        else if (lines[i].trim() !== '' && lines[i].trim() !== '---') sawContent = true
      }
      if (sawRemoval && !sawContent) {
        add('major', 'missingDocs 제거 ↔ 문서 구조', `src/content/${dir}/${file}.md:${index + 1}`,
          `섹션 "${line.trim()}" 의 항목이 전부 제거되어 제목만 남는다 → 섹션째로 삭제하라`)
      }
    })
  }
}

/* ---------- 4) 매핑 값 ↔ 실존 slug ---------- */
for (const [dir, map] of Object.entries(wikiMap)) {
  const files = filesByProject[dir] ?? []
  for (const [key, slug] of Object.entries(map)) {
    if (!files.includes(slug)) {
      add('major', 'wikiTargetToSlug ↔ 문서 파일', `project-docs.ts: ${dir}.${key}`,
        `매핑 대상 ${slug} 에 해당하는 문서 파일이 없다 (존재하지 않는 URL로 가는 링크)`)
    }
  }
}

/* ---------- 리포트 ---------- */
const order = { blocker: 0, major: 1, minor: 2 }
findings.sort((a, b) => order[a.severity] - order[b.severity])

console.log(`검사 대상: 프로젝트 ${projects.length}개, 문서 ${Object.values(filesByProject).flat().length}개\n`)
if (findings.length === 0) {
  console.log('정합성 결함 없음 (경계면 1~6 통과)')
  console.log('주의: 커리어 날짜 정합, 민감정보 잔존, 자산 참조는 이 스크립트가 검사하지 않는다.')
  process.exit(0)
}
for (const f of findings) {
  console.log(`[${f.severity}] ${f.boundary}\n  위치: ${f.where}\n  내용: ${f.message}\n`)
}
const counts = findings.reduce((acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] ?? 0) + 1 }), {})
console.log(`결함 ${findings.length}건 — ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`)
process.exit(1)
