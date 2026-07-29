import { Link } from 'react-router-dom'
import { Mail, MapPin } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { career } from '@/data/career'
import { profile, skills } from '@/data/profile'
import { projects } from '@/data/projects'

function initials(name: string) {
  return name.slice(0, 1)
}

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      {/* Hero */}
      <section className="flex flex-col items-center gap-6 text-center">
        <Avatar className="size-24">
          <AvatarImage src={profile.avatarUrl} alt={profile.name} />
          <AvatarFallback className="text-2xl">
            {initials(profile.name)}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {profile.name}
            <span className="text-muted-foreground font-normal"> · {profile.title}</span>
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-1 text-sm">
            <MapPin className="size-3.5" />
            {profile.location}
          </p>
        </div>

        <p className="text-muted-foreground max-w-xl leading-relaxed">
          {profile.tagline}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <a href={`mailto:${profile.email}`}>
              <Mail />
              연락하기
            </a>
          </Button>
          {profile.links.resume && (
            <Button variant="outline" asChild>
              <a href={profile.links.resume} target="_blank" rel="noreferrer">
                이력서 보기
              </a>
            </Button>
          )}
        </div>

        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          {profile.bio}
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </div>
      </section>

      <Separator className="my-16" />

      {/* Career */}
      <section>
        <h2 className="mb-6 text-xl font-semibold tracking-tight">경력</h2>
        <div className="space-y-4">
          {career.map((entry) => (
            <Card key={`${entry.company}-${entry.role}`}>
              <CardHeader>
                <CardTitle className="text-base">
                  {entry.company} · {entry.role}
                </CardTitle>
                <CardDescription>{entry.period}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{entry.description}</p>
                <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
                  {entry.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="my-16" />

      {/* Projects */}
      <section>
        <h2 className="mb-6 text-xl font-semibold tracking-tight">프로젝트</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Link key={project.slug} to={`/projects/${project.slug}`}>
              <Card className="h-full transition-colors hover:bg-accent/50">
                <CardHeader>
                  <CardTitle className="text-base">{project.title}</CardTitle>
                  <CardDescription>
                    {project.role} · {project.period}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {project.summary}
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
      </section>
    </main>
  )
}
