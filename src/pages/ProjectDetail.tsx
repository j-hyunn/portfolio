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
}: {
  group: ProjectDocGroup
  projectSlug: string
  activeDoc?: string
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
  const isEmpty = allProjectDocs(project).length === 0

  return (
    <nav className="lg:sticky lg:top-10 lg:w-52 lg:shrink-0 lg:self-start">
      <p className="text-muted-foreground px-3 pb-2 text-xs font-medium tracking-wide">
        {project.title}
      </p>
      <ul className="space-y-0.5">
        <li>
          <Link to={`/projects/${project.slug}`} className={navItemClass(!activeDoc)}>
            Overview
          </Link>
        </li>
        {project.docs.map((doc) => (
          <li key={doc.slug}>
            <Link
              to={`/projects/${project.slug}/${doc.slug}`}
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
          />
        ))}
      </ul>
      {isEmpty && (
        <p className="text-muted-foreground/70 mt-2 px-3 text-xs">산출물 준비 중</p>
      )}
    </nav>
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
