import { career, careerIntro, type CareerEntry } from '@/data/career'

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

type Tone = 'gray' | 'blue' | 'violet' | 'none'

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
      return job.type === 'education' ? 'violet' : 'blue'
    }
  }
  return 'gray'
}

const lineClass: Record<Tone, string> = {
  gray: 'bg-border w-px',
  blue: 'bg-blue-400 w-[2px]',
  violet: 'bg-violet-400 w-[2px]',
  none: 'bg-transparent w-px',
}

const dotClass: Record<Tone, string> = {
  gray: 'bg-muted-foreground/40',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  none: 'bg-muted-foreground/40',
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
        <h1 className="text-2xl font-bold tracking-tight">경력</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{careerIntro}</p>
      </header>

      <div>
        {markers.map((marker, i) => {
          const top: Tone = i === 0 ? 'none' : segTones[i - 1]
          const bottom: Tone = i === markers.length - 1 ? 'none' : segTones[i]

          if (marker.kind === 'year') {
            return (
              <div key={marker.key} className="flex">
                <div className="w-14 shrink-0 py-1 pr-3 text-right">
                  <span className="text-foreground text-xl font-bold tracking-tight">
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
          const isEducation = entry?.type === 'education'
          // split이면 위쪽 점(이전 구간의 끝)과 아래쪽 점(다음 구간의 시작)을 1px 띄운다.
          const endDotTone: Tone = top === 'none' ? 'gray' : top
          const startDotTone: Tone = bottom === 'none' ? 'gray' : bottom

          return (
            <div key={marker.key} className="flex">
              <div className="relative w-14 shrink-0">
                <span
                  className={`text-muted-foreground absolute right-3 text-sm -translate-y-1/2 ${
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
                {entry && (
                  <>
                    <p className="leading-snug">
                      <span className="text-foreground font-medium">
                        {entry.company} {isEducation ? '-' : '·'} {entry.role}
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {entry.domain}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {entry.period} ({entry.duration})
                    </p>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
