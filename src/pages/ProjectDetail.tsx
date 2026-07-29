import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { projects } from '@/data/projects'

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const project = projects.find((p) => p.slug === slug)

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Button variant="ghost" size="sm" asChild className="mb-8">
        <Link to="/">
          <ArrowLeft />
          목록으로
        </Link>
      </Button>

      <h1 className="text-2xl font-bold tracking-tight">
        {project ? project.title : '프로젝트를 찾을 수 없습니다'}
      </h1>
      <p className="text-muted-foreground mt-4">
        상세 페이지는 준비 중입니다.
      </p>
    </main>
  )
}
