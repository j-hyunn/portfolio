import { paprikaProjects } from './paprika-projects'
import { techupProjects } from './techup-projects'

// 카드를 클릭하면 열리는 중첩 드로어의 상세 본문 한 덩어리
export type ProjectSection = {
  heading: string
  body?: string
  bullets?: string[]
  quote?: string
}

// 커리어 항목을 클릭하면 열리는 드로어에 카드로 나열되는 회사 프로젝트
export type CareerProject = {
  title: string
  period: string
  summary: string
  role?: string
  goal?: string
  // 카드 하단에 뱃지로 노출되는 핵심 성과 지표
  metrics?: string[]
  tags?: string[]
  // 중첩 드로어에서 보여줄 상세 내용
  sections?: ProjectSection[]
  // 상세 드로어 하단에 노출되는 외부 자료 링크
  links?: { label: string; url: string }[]
}

export type CareerEntry = {
  type: 'work' | 'education'
  company: string
  role: string
  domain: string
  startDate: string
  endDate: string | null
  period: string
  duration: string
  description: string
  projects?: CareerProject[]
}

export const careerIntro =
  '사용자의 행동 데이터와 인터뷰를 기반으로 문제를 정의하고 제품으로 풀어온 PM입니다.'

export const career: CareerEntry[] = [
  {
    type: 'education',
    company: 'Tech Up',
    role: 'Product Management 1기',
    domain: 'Bootcamp · KT Cloud',
    startDate: '2025-09',
    endDate: '2026-04',
    period: '2025.09 - 2026.04',
    duration: '7개월',
    description: '',
    projects: techupProjects,
  },
  {
    type: 'work',
    company: 'Paprika Data Lab Inc.',
    role: 'Product Manager',
    domain: 'B2B SaaS · 프로덕트팀',
    startDate: '2023-11',
    endDate: '2025-09',
    period: '2023.11 - 2025.09',
    duration: '1년 11개월',
    description: '데이터 기반 기능 기획 및 디자인, 고객사 인터뷰 / 시장조사, 일정 관리',
    projects: paprikaProjects,
  },
  {
    type: 'work',
    company: 'Newlink',
    role: '서비스 기획 · Product Designer',
    domain: 'B2C Fintech · 서비스개발실',
    startDate: '2022-01',
    endDate: '2023-10',
    period: '2022.01 - 2023.10',
    duration: '1년 10개월',
    description: 'VoC 기반 문제 정의, UI/UX 개선 전략 수립, 디자인 시스템 구축',
  },
  {
    type: 'work',
    company: 'Brave People',
    role: 'BX Designer',
    domain: 'B2C Commerce · 기획전략실',
    startDate: '2020-07',
    endDate: '2021-08',
    period: '2020.07 - 2021.08',
    duration: '1년 1개월',
    description: '사용자 피드백 기반 제품 포지셔닝, SNS 채널 및 이벤트 운영',
  },
]
