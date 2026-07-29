export type CareerEntry = {
  company: string
  role: string
  period: string
  description: string
  highlights: string[]
}

export const career: CareerEntry[] = [
  {
    company: '회사명 A',
    role: 'Product Manager',
    period: '2023.01 - 현재',
    description: '핵심 서비스의 신규 기능 기획 및 성장 지표 개선을 담당했습니다.',
    highlights: [
      '핵심 지표 20% 개선',
      '신규 기능 기획 및 출시 3건',
      '데이터 기반 실험 설계 및 분석',
    ],
  },
  {
    company: '회사명 B',
    role: 'Associate PM',
    period: '2021.03 - 2022.12',
    description: '0-to-1 프로덕트를 기획하고 초기 사용자 확보 전략을 수립했습니다.',
    highlights: [
      'MVP 기획 및 출시',
      '초기 사용자 1만 명 확보',
      '유저 리서치 기반 UX 개선',
    ],
  },
]
