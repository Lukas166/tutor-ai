import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Mahasiswa'
  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <div className={styles.root}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.logoMark}>
            <svg viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="19" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
              <path d="M10 28 L20 10 L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.5 22 L26.5 22" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="20" cy="20" r="3" fill="rgba(201,162,39,0.9)"/>
            </svg>
          </div>
          <div>
            <span className={styles.logoName}>LiVE</span>
            <span className={styles.logoSub}>Unpad</span>
          </div>
        </div>

        <nav className={styles.nav}>
          {[
            { icon: '⊞', label: 'Dashboard', active: true },
            { icon: '📚', label: 'Mata Kuliah' },
            { icon: '📅', label: 'Jadwal' },
            { icon: '📝', label: 'Tugas' },
            { icon: '🏆', label: 'Nilai' },
            { icon: '💬', label: 'Forum' },
          ].map(item => (
            <a
              key={item.label}
              href="#"
              className={`${styles.navItem} ${item.active ? styles.navActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <form action="/auth/signout" method="POST" className={styles.sidebarFooter}>
          <button type="submit" className={styles.logoutBtn}>
            <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
              <path d="M7 3H4a1 1 0 00-1 1v12a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M13 14l3-4-3-4M16 10H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Keluar
          </button>
        </form>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.greeting}>Selamat datang, <span>{displayName}</span> 👋</h1>
            <p className={styles.subGreeting}>Siap untuk belajar hari ini?</p>
          </div>
          <div className={styles.headerUser}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className={styles.avatar} />
            ) : (
              <div className={styles.avatarFallback}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          </div>
        </header>

        {/* Stats cards */}
        <div className={styles.statsGrid}>
          {[
            { label: 'Mata Kuliah Aktif', value: '6', icon: '📚', color: '#1a4b8c' },
            { label: 'Tugas Mendatang', value: '3', icon: '📝', color: '#c9a227' },
            { label: 'Forum Diskusi', value: '12', icon: '💬', color: '#16a34a' },
            { label: 'Nilai Rata-rata', value: 'A-', icon: '🏆', color: '#7c3aed' },
          ].map(stat => (
            <div key={stat.label} className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: `${stat.color}15`, color: stat.color }}>
                {stat.icon}
              </div>
              <div>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Auth info card */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardHeader}>
            <div className={styles.infoCardBadge}>✓ Terautentikasi via Supabase</div>
            <h2>Informasi Akun</h2>
          </div>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>User ID</span>
              <span className={styles.infoValue} style={{ fontFamily: 'monospace', fontSize: '12px' }}>{user.id}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Provider</span>
              <span className={styles.infoValue}>{user.app_metadata?.provider || 'email'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Bergabung</span>
              <span className={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}