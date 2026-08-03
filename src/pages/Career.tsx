import { ChevronRight, ExternalLink, X } from 'lucide-react'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  career,
  careerIntro,
  type CareerEntry,
  type CareerProject,
} from '@/data/career'
import { useIsMobile } from '@/hooks/use-media-query'

const monthAbbr = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// 시간을 "연*12+월" 숫자 하나로 다뤄서 축 위 위치/포함 관계를 판정한다.
function ym(dateStr: string) {
  const [y, m] = dateStr.split('-').map(Number)
  return y * 12 + (m - 1)
}

const nowYm = new Date().getFullYear() * 12 + new Date().getMonth()

function jobRange(entry: CareerEntry) {
  return { start: ym(entry.startDate), end: entry.endDate ? ym(entry.endDate) : nowYm }
}

type Tone = 'gray' | 'blue' | 'green' | 'none'

type Marker = {
  kind: 'year' | 'month'
  key: string
  label: string
  time: number
  entry?: CareerEntry
  // 한 달에 끝점과 시작점이 겹치면 점 두 개를 1px 간격으로 나눠 그린다.
  split?: boolean
}

function buildMarkers(jobs: CareerEntry[]): Marker[] {
  const seq: Marker[] = []

  // 같은 연-월 지점은 한 행으로 묶되, 끝/시작이 겹치면 split으로 표시한다.
  const pushMonth = (time: number): Marker => {
    const last = seq[seq.length - 1]
    if (last && last.time === time) {
      last.split = true
      return last
    }
    const marker: Marker = {
      kind: 'month',
      key: `m-${time}`,
      label: monthAbbr[time % 12],
      time,
    }
    seq.push(marker)
    return marker
  }

  jobs.forEach((job) => {
    const { start, end } = jobRange(job)
    // 항목 내용은 종료월 점 오른쪽에 붙인다.
    pushMonth(end).entry ??= job
    pushMonth(start)
  })

  // 연도가 바뀌는 지점(및 맨 위)에 연도 원을 끼워 넣는다.
  // 원의 시간값은 해당 연도 12월과 다음 해 1월 사이의 경계로 둔다.
  const out: Marker[] = []
  let prevYear: number | null = null
  for (const marker of seq) {
    const year = Math.floor(marker.time / 12)
    if (prevYear !== year) {
      out.push({ kind: 'year', key: `y-${year}`, label: String(year), time: year * 12 + 11.5 })
      prevYear = year
    }
    out.push(marker)
  }
  return out
}

// 축 위 두 지점 사이 구간이 어떤 기간(재직/교육/공백)에 속하는지 판정
function segmentTone(midTime: number, jobs: CareerEntry[]): Tone {
  for (const job of jobs) {
    const { start, end } = jobRange(job)
    if (midTime >= start && midTime <= end) {
      return job.type === 'education' ? 'green' : 'blue'
    }
  }
  return 'gray'
}

const lineClass: Record<Tone, string> = {
  gray: 'bg-border w-px',
  blue: 'bg-blue-400 w-[2px]',
  green: 'bg-green-400 w-[2px]',
  none: 'bg-transparent w-px',
}

const dotClass: Record<Tone, string> = {
  gray: 'bg-muted-foreground/40',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  none: 'bg-muted-foreground/40',
}

// 프로젝트 카드. 카드 자체가 트리거라, 클릭하면 커리어 드로어 위로 중첩 드로어가 쌓인다.
function ProjectCard({ project }: { project: CareerProject }) {
  const sections = project.sections ?? []
  // 모바일에서는 바텀 시트처럼 아래에서 위로 올라오게 한다.
  const isMobile = useIsMobile()

  return (
    <Drawer swipeDirection={isMobile ? 'down' : 'right'} showSwipeHandle={isMobile}>
      <DrawerTrigger className="group bg-muted/60 hover:bg-muted block w-full cursor-pointer rounded-lg p-5 text-left transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]">
        <p className="text-muted-foreground text-sm">{project.period}</p>
        <p className="text-foreground mt-1 flex items-start gap-1 text-base font-medium">
          <span className="min-w-0">{project.title}</span>
          <ChevronRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </p>
        {project.metrics && project.metrics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.metrics.map((metric) => (
              <span
                key={metric}
                className="bg-background text-foreground rounded-full border px-2 py-0.5 text-sm"
              >
                {metric}
              </span>
            ))}
          </div>
        )}

        {project.tags && project.tags.length > 0 && (
          <p className="text-muted-foreground mt-3 text-sm">{project.tags.join(' · ')}</p>
        )}
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader className="border-b pr-14 group-data-[swipe-axis=y]/drawer-popup:text-left">
          <p className="text-muted-foreground text-sm">{project.period}</p>
          <DrawerTitle className="text-xl">{project.title}</DrawerTitle>
          {project.role && (
            <DrawerDescription className="text-base">{project.role}</DrawerDescription>
          )}
          {project.links && project.links.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {project.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-muted text-foreground hover:bg-accent inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  {link.label}
                  <ExternalLink className="size-3 shrink-0" />
                </a>
              ))}
            </div>
          )}
          <DrawerClose
            aria-label="닫기"
            className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-5 right-5 cursor-pointer rounded-md p-1.5 transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <X className="size-4" />
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <p className="text-muted-foreground mb-4 text-base leading-relaxed">{project.summary}</p>

          {project.goal && (
            <p className="text-muted-foreground mb-4 text-base">
              <span className="text-foreground font-medium">Goal</span> · {project.goal}
            </p>
          )}

          {project.metrics && project.metrics.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {project.metrics.map((metric) => (
                <span
                  key={metric}
                  className="bg-muted text-foreground rounded-full px-2 py-0.5 text-sm"
                >
                  {metric}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.heading}>
                <h3 className="text-foreground text-base font-semibold">{section.heading}</h3>
                {section.body && (
                  <p className="text-muted-foreground mt-2 text-base leading-relaxed">
                    {section.body}
                  </p>
                )}
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="text-muted-foreground mt-2 list-disc space-y-1.5 pl-4 text-base leading-relaxed">
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {section.quote && (
                  <blockquote className="border-foreground/20 text-foreground mt-3 border-l-2 pl-3 text-base leading-relaxed italic">
                    {section.quote}
                  </blockquote>
                )}
              </section>
            ))}
          </div>

        </div>
      </DrawerContent>
    </Drawer>
  )
}

// 커리어 항목 요약. 나열할 프로젝트가 없는 항목은 드로어 없이 텍스트로만 보여준다.
function CareerDrawer({ entry }: { entry: CareerEntry }) {
  const projects = entry.projects ?? []
  // 모바일에서는 바텀 시트처럼 아래에서 위로 올라오게 한다.
  const isMobile = useIsMobile()

  // 타이틀 / 포지션 / 분야·팀 / 재직 기간 순서로 쌓인다. 포지션이 없으면 그 줄만 빠진다.
  const meta = (
    <>
      {entry.role && (
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{entry.role}</p>
      )}
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{entry.domain}</p>
      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
        {entry.period} ({entry.duration})
      </p>
    </>
  )

  if (projects.length === 0) {
    return (
      <>
        <p className="leading-snug">
          <span className="text-foreground text-lg font-medium">{entry.company}</span>
        </p>
        {meta}
      </>
    )
  }

  return (
    <Drawer swipeDirection={isMobile ? 'down' : 'right'} showSwipeHandle={isMobile}>
      <DrawerTrigger className="group -mx-2 -my-1 block w-full cursor-pointer rounded-md px-2 py-1 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px]">
        <p className="flex items-center gap-1 leading-snug">
          <span className="text-foreground text-lg font-medium">{entry.company}</span>
          <ChevronRight className="text-muted-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </p>
        {meta}
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader className="border-b pr-14 group-data-[swipe-axis=y]/drawer-popup:text-left">
          <p className="text-muted-foreground text-sm">
            {entry.period} ({entry.duration})
          </p>
          <DrawerTitle className="text-xl">{entry.company}</DrawerTitle>
          <DrawerDescription className="text-base">
            {entry.role ? `${entry.role} · ${entry.domain}` : entry.domain}
          </DrawerDescription>
          <DrawerClose
            aria-label="닫기"
            className="text-muted-foreground hover:bg-accent hover:text-foreground absolute top-5 right-5 cursor-pointer rounded-md p-1.5 transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <X className="size-4" />
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {entry.description && (
            <p className="text-muted-foreground mb-6 text-base leading-relaxed">
              {entry.description}
            </p>
          )}

          <ul className="space-y-3">
            {projects.map((project) => (
              <li key={project.title}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default function Career() {
  const sorted = [...career].sort((a, b) => b.startDate.localeCompare(a.startDate))
  const markers = buildMarkers(sorted)

  // 인접한 마커 쌍 사이 구간의 색: 구간 중앙 시각이 속한 기간으로 결정
  const segTones: Tone[] = markers.slice(0, -1).map((marker, i) => {
    const mid = (marker.time + markers[i + 1].time) / 2
    return segmentTone(mid, sorted)
  })

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 lg:py-14">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">경력</h1>
        <p className="text-muted-foreground mt-2 text-base leading-relaxed">{careerIntro}</p>
      </header>

      <div>
        {markers.map((marker, i) => {
          const top: Tone = i === 0 ? 'none' : segTones[i - 1]
          const bottom: Tone = i === markers.length - 1 ? 'none' : segTones[i]

          if (marker.kind === 'year') {
            return (
              <div key={marker.key} className="flex">
                <div className="w-14 shrink-0 py-1 pr-3 text-right">
                  <span className="text-foreground text-2xl font-medium tracking-tight">
                    {marker.label}
                  </span>
                </div>
                <div className="relative flex w-6 shrink-0 items-center justify-center self-stretch">
                  <span
                    className={`absolute top-0 left-1/2 h-1/2 -translate-x-1/2 ${lineClass[top]}`}
                  />
                  <span
                    className={`absolute bottom-0 left-1/2 h-1/2 -translate-x-1/2 ${lineClass[bottom]}`}
                  />
                  <span className="border-muted-foreground/50 bg-background relative z-10 size-4 rounded-full border-2" />
                </div>
                <div className="flex-1" />
              </div>
            )
          }

          const dotTone: Tone =
            bottom !== 'gray' && bottom !== 'none' ? bottom : top !== 'none' ? top : 'gray'
          const { entry, split } = marker
          // split이면 위쪽 점(이전 구간의 끝)과 아래쪽 점(다음 구간의 시작)을 1px 띄운다.
          const endDotTone: Tone = top === 'none' ? 'gray' : top
          const startDotTone: Tone = bottom === 'none' ? 'gray' : bottom

          return (
            <div key={marker.key} className="flex">
              <div className="relative w-14 shrink-0">
                <span
                  className={`text-muted-foreground absolute right-3 text-base -translate-y-1/2 ${
                    split ? 'top-[18.5px]' : 'top-[14px]'
                  }`}
                >
                  {marker.label}
                </span>
              </div>
              <div className="relative w-6 shrink-0 self-stretch">
                <span
                  className={`absolute top-0 left-1/2 h-[14px] -translate-x-1/2 ${lineClass[top]}`}
                />
                <span
                  className={`absolute ${split ? 'top-[23px]' : 'top-[14px]'} bottom-0 left-1/2 -translate-x-1/2 ${lineClass[bottom]}`}
                />
                {split ? (
                  <>
                    <span
                      className={`absolute top-[14px] left-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${dotClass[endDotTone]}`}
                    />
                    <span
                      className={`absolute top-[23px] left-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${dotClass[startDotTone]}`}
                    />
                  </>
                ) : (
                  <span
                    className={`absolute top-[14px] left-1/2 z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${dotClass[dotTone]}`}
                  />
                )}
              </div>
              <div
                className={`min-w-0 flex-1 pl-3 ${split ? 'pt-[25px]' : 'pt-4'} ${entry ? 'pb-6' : 'pb-3'}`}
              >
                {entry && <CareerDrawer entry={entry} />}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
