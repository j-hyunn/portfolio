import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Briefcase,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Link2,
  Mail,
  Menu,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { profile } from '@/data/profile'

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/career', label: 'Career', icon: Briefcase },
  { to: '/projects', label: 'Side Projects', icon: FolderKanban },
]

function initials(name: string) {
  return name.slice(0, 1)
}

function isNavItemActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function Sidebar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b bg-gray-50 px-4 lg:hidden">
        <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">
          {profile.nameEn}
        </Link>
        <button
          type="button"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 top-14 z-40 flex w-64 flex-col justify-between overflow-y-auto border-r bg-gray-50 px-6 py-10 transition-transform duration-200 lg:top-0 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col items-start gap-4">
          <Avatar className="size-20 border border-black/10">
            <AvatarImage src={profile.avatarUrl} alt={profile.name} className="object-cover" />
            <AvatarFallback className="bg-black/5 text-lg text-foreground">
              {initials(profile.name)}
            </AvatarFallback>
          </Avatar>

          <div className="text-left">
            <p className="text-base font-semibold text-foreground">{profile.nameEn}</p>
            <p className="mt-1 text-xs text-muted-foreground">{profile.title}</p>
          </div>

          <div className="flex items-center gap-1">
            <a
              href={`mailto:${profile.email}`}
              aria-label="Email"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
            >
              <Mail className="size-4" />
            </a>
            <a
              href={profile.links.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
            >
              <Link2 className="size-4" />
            </a>
            <a
              href={profile.links.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
            >
              <Globe className="size-4" />
            </a>
          </div>

          <nav className="mt-6 w-full space-y-1">
            {navItems.map((item) => {
              const isActive = isNavItemActive(location.pathname, item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-white text-foreground font-medium shadow-sm'
                      : 'text-muted-foreground hover:bg-black/5 hover:text-foreground'
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <p className="text-left text-[11px] text-muted-foreground/70">
          &copy; {new Date().getFullYear()} {profile.nameEn}
        </p>
      </aside>
    </>
  )
}
