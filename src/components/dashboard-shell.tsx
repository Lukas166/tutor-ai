import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from '@/app/dashboard/dashboard.module.css'
import {
  getDashboardPath,
  getDisplayName,
  getRoleGroupLabel,
  getRoleLabel,
} from '@/lib/auth-types'
import type { AppSession } from '@/lib/auth-types'

type DashboardShellProps = {
  session: AppSession
  title: string
  subtitle: string
  active: 'dashboard' | 'profile'
  children: ReactNode
}

export function DashboardShell({
  session,
  title,
  subtitle,
  active,
  children,
}: DashboardShellProps) {
  const displayName = getDisplayName(session.user.fullName, session.user.email)
  const dashboardPath = getDashboardPath(session.user.role)

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="19" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <path d="M10 28 L20 10 L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.5 22 L26.5 22" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20" cy="20" r="3" fill="rgba(201,162,39,0.9)" />
            </svg>
          </div>
          <div>
            <span className={styles.logoName}>Tutor-AI</span>
            <span className={styles.logoSub}>Unpad</span>
          </div>
        </div>

        <div className={styles.roleCard}>
          <span className={styles.roleCardLabel}>Peran aktif</span>
          <strong className={styles.roleCardValue}>{getRoleLabel(session.user.role)}</strong>
          <span className={styles.roleCardMeta}>{getRoleGroupLabel(session.user.roleGroup)}</span>
        </div>

        <nav className={styles.nav}>
          <Link
            href={dashboardPath}
            className={`${styles.navItem} ${active === 'dashboard' ? styles.navActive : ''}`}
          >
            <span className={styles.navIcon}>⊞</span>
            <span>Dashboard</span>
          </Link>
          <Link
            href="/profile"
            className={`${styles.navItem} ${active === 'profile' ? styles.navActive : ''}`}
          >
            <span className={styles.navIcon}>👤</span>
            <span>Profil</span>
          </Link>
        </nav>

        <form action="/auth/signout" method="POST" className={styles.sidebarFooter}>
          <button type="submit" className={styles.logoutBtn}>
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
              <path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M13 14l3-4-3-4M16 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Keluar
          </button>
        </form>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.greeting}>
              Selamat datang, <span>{displayName}</span> 👋
            </h1>
            <p className={styles.subGreeting}>{subtitle}</p>
          </div>
          <div className={styles.headerUser}>
            {session.user.avatarUrl ? (
              <img src={session.user.avatarUrl} alt={displayName} className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>{displayName.charAt(0).toUpperCase()}</div>
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userEmail}>{session.user.email}</span>
            </div>
          </div>
        </header>

        <div className={styles.pageStack}>{children}</div>
      </main>
    </div>
  )
}
