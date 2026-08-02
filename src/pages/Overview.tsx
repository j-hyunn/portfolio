import {
  capabilities,
  certificates,
  principles,
  skillGroups,
  strengths,
  type ValueItem,
} from '@/data/overview'
import { profile } from '@/data/profile'

function Divider() {
  return <span className="text-muted-foreground/40 mx-2.5">|</span>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-4 text-2xl font-bold tracking-tight">
      {children}
      <span className="border-border h-0 flex-1 border-t" />
    </h2>
  )
}

function ValueSection({ title, items }: { title: string; items: ValueItem[] }) {
  return (
    <section className="mt-20">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((item) => (
          <div key={item.title} className="bg-secondary rounded-xl p-4">
            <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Overview() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-8 lg:py-10">
      <section>
        <h1 className="text-3xl leading-[1.35] font-bold tracking-tight sm:text-4xl">
          {profile.headline.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h1>

        <div className="text-muted-foreground mt-6 text-lg leading-[1.9]">
          {profile.intro.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <SectionTitle>Info</SectionTitle>
        <dl className="mt-6 space-y-4">
          <div className="grid gap-y-2 sm:grid-cols-[180px_1fr] sm:gap-x-8">
            <dt className="text-base font-medium tracking-tight">Birth</dt>
            <dd className="text-muted-foreground text-base">{profile.birth}</dd>
          </div>
          <div className="grid gap-y-2 sm:grid-cols-[180px_1fr] sm:gap-x-8">
            <dt className="text-base font-medium tracking-tight">Education</dt>
            <dd className="text-muted-foreground text-base">
              {profile.education.map((part, i) => (
                <span key={part}>
                  {i > 0 && <Divider />}
                  {part}
                </span>
              ))}
            </dd>
          </div>
          <div className="grid gap-y-2 sm:grid-cols-[180px_1fr] sm:gap-x-8">
            <dt className="text-base font-medium tracking-tight">Contact</dt>
            <dd className="text-muted-foreground space-y-1 text-base">
              <p>
                <span className="text-foreground/70">Tel.</span>{' '}
                <a
                  href={`tel:${profile.phone.replace(/\s/g, '')}`}
                  className="hover:text-foreground"
                >
                  {profile.phone}
                </a>
              </p>
              <p>
                <span className="text-foreground/70">Email.</span>{' '}
                <a href={`mailto:${profile.email}`} className="hover:text-foreground">
                  {profile.email}
                </a>
              </p>
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-20">
        <SectionTitle>Certificated &amp; Prize</SectionTitle>
        <dl className="mt-6 space-y-4">
          {certificates.map((cert) => (
            <div key={cert.label} className="grid gap-y-2 sm:grid-cols-[180px_1fr] sm:gap-x-8">
              <dt className="text-base font-medium tracking-tight">{cert.label}</dt>
              <dd className="text-muted-foreground space-y-1 text-base">
                {cert.items.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-20">
        <div className="grid gap-x-12 gap-y-14 md:grid-cols-2">
          <div>
            <SectionTitle>Core Competency</SectionTitle>
            <dl className="mt-6 space-y-7">
              {capabilities.map((capability) => (
                <div
                  key={capability.category}
                  className="grid gap-y-2 sm:grid-cols-[140px_1fr] sm:gap-x-4"
                >
                  <dt className="text-base font-medium tracking-tight">{capability.category}</dt>
                  <dd>
                    <ul className="text-muted-foreground space-y-2 text-base">
                      {capability.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <SectionTitle>Hard &amp; Soft Skills</SectionTitle>
            <div className="mt-6 space-y-3">
              {skillGroups.map((group) => (
                <div key={group.join()} className="flex flex-wrap gap-2">
                  {group.map((skill) => (
                    <span
                      key={skill}
                      className="bg-secondary text-secondary-foreground rounded-lg px-3.5 py-2 text-base"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ValueSection title="Principles" items={principles} />
      <ValueSection title="Strength" items={strengths} />
    </main>
  )
}
