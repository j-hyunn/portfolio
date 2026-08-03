import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Briefcase, FolderKanban, LayoutDashboard, Mail, Menu, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { profile } from '@/data/profile'

// lucide-react v1에서 브랜드 아이콘이 제거되어 lucide 규격(24 viewBox)에 맞춰 직접 정의
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.635 22.412c.575.106.786-.25.786-.556 0-.274-.01-1.0-.016-1.963-3.198.695-3.873-1.541-3.873-1.541-.523-1.328-1.277-1.682-1.277-1.682-1.044-.714.079-.699.079-.699 1.154.081 1.762 1.185 1.762 1.185 1.026 1.758 2.691 1.25 3.346.956.104-.743.401-1.25.73-1.538-2.553-.291-5.238-1.277-5.238-5.683 0-1.255.449-2.281 1.185-3.086-.119-.291-.514-1.461.112-3.045 0 0 .966-.309 3.166 1.179a11.02 11.02 0 0 1 2.882-.388c.978.005 1.963.133 2.883.388 2.198-1.488 3.163-1.179 3.163-1.179.627 1.584.232 2.754.114 3.045.738.805 1.183 1.831 1.183 3.086 0 4.417-2.689 5.389-5.25 5.674.413.355.78 1.056.78 2.129 0 1.537-.014 2.777-.014 3.155 0 .308.208.667.792.554A11.502 11.502 0 0 0 12 .5Z" />
    </svg>
  )
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M20.45 20.45h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.355V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.284ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124ZM7.119 20.45H3.555V9h3.564v11.45ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  )
}

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
              <GithubIcon className="size-4" />
            </a>
            <a
              href={profile.links.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
            >
              <LinkedinIcon className="size-4" />
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
