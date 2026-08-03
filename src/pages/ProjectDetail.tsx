import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { MarkdownDoc } from '@/components/projects/markdown-doc'
import { PlayballOverview } from '@/components/projects/playball-overview'
import { ReplaiDevHarness } from '@/components/projects/replai-dev-harness'
import { ReplaiOverview } from '@/components/projects/replai-overview'
import { markdownDocs } from '@/data/project-docs'
import {
  allProjectDocs,
  projects,
  type ProjectDocGroup,
  type ProjectEntry,
} from '@/data/projects'

/** 직접 만든 산출물 본문. 키는 `${projectSlug}/${docSlug}`. */
const customDocs: Record<string, () => React.JSX.Element> = {
  'replai/dev-harness': ReplaiDevHarness,
}

function navItemClass(isActive: boolean, nested = false) {
  return `block rounded-md py-2 text-sm transition-colors ${nested ? 'pr-3 pl-6' : 'px-3'} ${
    isActive
      ? 'bg-secondary text-foreground font-medium'
      : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
  }`
}

function DocGroupNav({
  group,
  projectSlug,
  activeDoc,
  onNavigate,
}: {
  group: ProjectDocGroup
  projectSlug: string
  activeDoc?: string
  onNavigate: () => void
}) {
  const hasActive = group.docs.some((doc) => doc.slug === activeDoc)
  const [open, setOpen] = useState(true)
  // 다른 그룹의 문서로 이동했다가 돌아와도 활성 항목이 보이도록 펼친다.
  const expanded = open || hasActive

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(!expanded)}
        aria-expanded={expanded}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-black/5"
      >
        <span className="font-medium">{group.title}</span>
        <ChevronDown
          className={`size-3.5 transition-transform ${expanded ? '' : '-rotate-90'}`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <ul className="mt-0.5 space-y-0.5">
          {group.docs.map((doc) => (
            <li key={doc.slug}>
              <Link
                to={`/projects/${projectSlug}/${doc.slug}`}
                onClick={onNavigate}
                className={navItemClass(activeDoc === doc.slug, true)}
              >
                {doc.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function ProjectNav({ project, activeDoc }: { project: ProjectEntry; activeDoc?: string }) {
  const groups = project.docGroups ?? []
  const docs = allProjectDocs(project)
  const isEmpty = docs.length === 0
  // 모바일에서는 문서 목록이 길어져 본문을 밀어내므로 드롭다운으로 접어 둔다.
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)
  const currentTitle = docs.find((doc) => doc.slug === activeDoc)?.title ?? 'Overview'

  return (
    /* 모바일에서는 상단 헤더(h-14) 바로 아래에 드롭다운 트리거를 고정한다. */
    <div className="bg-background sticky top-14 z-30 -mx-6 px-6 py-2 lg:top-10 lg:mx-0 lg:w-52 lg:shrink-0 lg:self-start lg:px-0 lg:py-0">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-expanded={mobileOpen}
        className="flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors hover:bg-black/5 lg:hidden"
      >
        <span className="min-w-0 truncate">
          <span className="text-muted-foreground">{project.title}</span>
          <span className="text-muted-foreground/50 mx-1.5">/</span>
          <span className="text-foreground font-medium">{currentTitle}</span>
        </span>
        <ChevronDown
          className={`text-muted-foreground size-4 shrink-0 transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      <p className="text-muted-foreground hidden px-3 pb-2 text-xs font-medium tracking-wide lg:block">
        {project.title}
      </p>

      <nav
        className={`bg-background absolute inset-x-6 top-full max-h-[60vh] overflow-y-auto rounded-md border p-1 shadow-lg lg:static lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none ${
          mobileOpen ? 'block' : 'hidden lg:block'
        }`}
      >
        <ul className="space-y-0.5">
          <li>
            <Link
              to={`/projects/${project.slug}`}
              onClick={closeMobile}
              className={navItemClass(!activeDoc)}
            >
              Overview
            </Link>
          </li>
          {project.docs.map((doc) => (
            <li key={doc.slug}>
              <Link
                to={`/projects/${project.slug}/${doc.slug}`}
                onClick={closeMobile}
                className={navItemClass(activeDoc === doc.slug)}
              >
                {doc.title}
              </Link>
            </li>
          ))}
          {groups.map((group) => (
            <DocGroupNav
              key={group.title}
              group={group}
              projectSlug={project.slug}
              activeDoc={activeDoc}
              onNavigate={closeMobile}
            />
          ))}
        </ul>
        {isEmpty && <p className="text-muted-foreground/70 mt-2 px-3 text-xs">산출물 준비 중</p>}
      </nav>
    </div>
  )
}

function ProjectOverview({ project }: { project: ProjectEntry }) {
  if (project.slug === 'replai') return <ReplaiOverview />
  if (project.slug === 'playball') return <PlayballOverview />

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
      <p className="text-muted-foreground mt-2 text-sm">{project.period}</p>
      <p className="text-muted-foreground mt-4 leading-relaxed">{project.description}</p>
    </div>
  )
}

export default function ProjectDetail() {
  const { slug, docSlug } = useParams<{ slug: string; docSlug?: string }>()
  const project = projects.find((p) => p.slug === slug)

  if (!project) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8 lg:py-10">
        <h1 className="text-2xl font-bold tracking-tight">프로젝트를 찾을 수 없습니다</h1>
        <Link to="/projects" className="mt-4 inline-block text-sm text-blue-700">
          Side Projects로 돌아가기
        </Link>
      </main>
    )
  }

  const doc = allProjectDocs(project).find((d) => d.slug === docSlug)
  const docKey = docSlug ? `${project.slug}/${docSlug}` : ''
  const DocBody = docSlug ? customDocs[docKey] : undefined
  const markdownSource = docSlug ? markdownDocs[docKey] : undefined

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 lg:py-10">
      <Link
        to="/projects"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Side Projects
      </Link>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:gap-12">
        <ProjectNav project={project} activeDoc={docSlug} />

        <div className="min-w-0 flex-1">
          {!docSlug ? (
            <ProjectOverview project={project} />
          ) : DocBody ? (
            <DocBody />
          ) : markdownSource && doc ? (
            <MarkdownDoc title={doc.title} source={markdownSource} />
          ) : (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {doc ? doc.title : '산출물을 찾을 수 없습니다'}
              </h1>
              <p className="text-muted-foreground mt-4 text-sm">산출물 문서는 준비 중입니다.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
