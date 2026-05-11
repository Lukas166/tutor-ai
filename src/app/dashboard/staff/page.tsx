import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { getDisplayName, getRoleLabel, getGuestSession } from '@/lib/auth-types'
import { getServerSession } from '@/lib/session'
import styles from '../dashboard.module.css'

const staffStats = [
  { label: 'Kelas diasuh', value: '4', icon: '📚', color: '#1a4b8c' },
  { label: 'Tugas menunggu', value: '18', icon: '📝', color: '#c9a227' },
  { label: 'Forum aktif', value: '7', icon: '💬', color: '#16a34a' },
  { label: 'Ruang evaluasi', value: '2', icon: '🏆', color: '#7c3aed' },
]

export default async function StaffDashboardPage() {
  const session = (await getServerSession()) ?? getGuestSession('dosen')

  if (session.user.roleGroup !== 'staff') {
    redirect('/dashboard/mahasiswa')
  }

  const displayName = getDisplayName(session.user.fullName, session.user.email)

  return (
    <DashboardShell
      session={session}
      active="dashboard"
      title="Dashboard Dosen / Admin"
    >
      <section className={styles.infoCard}>
        <div className={styles.infoCardHeader}>
          <div className={styles.infoCardBadge}>Mode {getRoleLabel(session.user.role)} aktif</div>
          <h2>Profile terpadu</h2>
        </div>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Nama tampil</span>
            <span className={styles.infoValue}>{displayName}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{session.user.email}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Role</span>
            <span className={styles.infoValue}>{getRoleLabel(session.user.role)}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Group</span>
            <span className={styles.infoValue}>Dosen / Admin</span>
          </div>
        </div>
        <div className={styles.actionRow}>
          <Link href="/profile" className={styles.linkButton}>
            Buka profile terpadu
          </Link>
        </div>
      </section>

      <div className={styles.statsGrid}>
        {staffStats.map((stat) => (
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

      <section className={styles.infoCard}>
        <div className={styles.infoCardHeader}>
          <div className={styles.infoCardBadge}>Kontrol pengajar</div>
          <h2>Prioritas staff</h2>
        </div>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Agenda utama</span>
            <span className={styles.infoValue}>Rekap penilaian, pembaruan materi, dan forum kelas.</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Notifikasi</span>
            <span className={styles.infoValue}>5 pengumpulan tugas menunggu verifikasi.</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Kelas berikutnya</span>
            <span className={styles.infoValue}>Pemrograman Web, 13.00 WIB.</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Akses cepat</span>
            <span className={styles.infoValue}>Profile terpadu untuk dosen dan admin.</span>
          </div>
        </div>
      </section>
    </DashboardShell>
  )
}
