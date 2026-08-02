import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { projects } from '@/data/projects'

export default function Projects() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 lg:py-14">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Side Projects</h1>
      <div className="flex flex-col gap-4">
        {projects.map((project) => (
          <Link key={project.slug} to={`/projects/${project.slug}`}>
            <Card className="h-full transition-colors hover:bg-accent/50">
              <CardHeader>
                <CardTitle className="text-base">{project.title}</CardTitle>
                <CardDescription>{project.period}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {project.description}
                </p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  )
}
