export type ProjectEntry = {
  slug: string
  title: string
  period: string
  role: string
  summary: string
  tags: string[]
}

export const projects: ProjectEntry[] = [
  {
    slug: 'project-one',
    title: '프로젝트 1',
    period: '2024',
    role: 'Product Manager',
    summary: '프로젝트에 대한 한 줄 요약을 여기에 작성합니다.',
    tags: ['기획', '데이터 분석'],
  },
  {
    slug: 'project-two',
    title: '프로젝트 2',
    period: '2023',
    role: 'Product Manager',
    summary: '프로젝트에 대한 한 줄 요약을 여기에 작성합니다.',
    tags: ['0-to-1', '리서치'],
  },
  {
    slug: 'project-three',
    title: '프로젝트 3',
    period: '2022',
    role: 'Associate PM',
    summary: '프로젝트에 대한 한 줄 요약을 여기에 작성합니다.',
    tags: ['성장', 'A/B 테스트'],
  },
]
