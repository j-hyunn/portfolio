import { Link } from 'react-router-dom'
import { Globe, Link2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { profile } from '@/data/profile'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <Link to="/" className="text-sm font-semibold tracking-tight">
          {profile.nameEn}
        </Link>
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <a href={`mailto:${profile.email}`} aria-label="Email">
              <Mail />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href={profile.links.github} target="_blank" rel="noreferrer" aria-label="GitHub">
              <Link2 />
            </a>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <a href={profile.links.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <Globe />
            </a>
          </Button>
        </nav>
      </div>
    </header>
  )
}
