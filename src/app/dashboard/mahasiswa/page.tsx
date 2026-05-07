import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { getDisplayName } from '@/lib/auth-types'
import { getServerSession } from '@/lib/session'
import styles from '../dashboard.module.css'

const studentStats = [
  { label: 'Mata kuliah aktif', value: '6', icon: '📚', color: '#1a4b8c' },
  { label: 'Tugas mendekati tenggat', value: '3', icon: '📝', color: '#c9a227' },
  { label: 'Forum diskusi', value: '12', icon: '💬', color: '#16a34a' },
  { label: 'Nilai rata-rata', value: 'A-', icon: '🏆', color: '#7c3aed' },
]

export default async function MahasiswaDashboardPage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  if (session.user.roleGroup !== 'mahasiswa') {
    redirect('/dashboard/staff')
  }

  const displayName = getDisplayName(session.user.fullName, session.user.email)

  return (
    <DashboardShell
      session={session}
      active="dashboard"
      title="Dashboard Mahasiswa"
      subtitle="Pantau kelas, tugas, dan forum dari profile yang sama untuk semua peran."
    >
      <section className={styles.infoCard}>
        <div className={styles.infoCardHeader}>
          <div className={styles.infoCardBadge}>Mode mahasiswa aktif</div>
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
            <span className={styles.infoValue}>Mahasiswa</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Group</span>
            <span className={styles.infoValue}>Mahasiswa</span>
          </div>
        </div>
        <div className={styles.actionRow}>
          <Link href="/profile" className={styles.linkButton}>
            Buka profile terpadu
          </Link>
        </div>
      </section>

      <div className={styles.statsGrid}>
        {studentStats.map((stat) => (
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
          <div className={styles.infoCardBadge}>Rencana belajar hari ini</div>
          <h2>Prioritas mahasiswa</h2>
        </div>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Agenda utama</span>
            <span className={styles.infoValue}>Kerjakan tugas mingguan dan cek forum kelas.</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Notifikasi</span>
            <span className={styles.infoValue}>1 pengumuman baru dari dosen.</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Jadwal berikutnya</span>
            <span className={styles.infoValue}>Matematika Komputasi, 09.00 WIB.</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Akses cepat</span>
            <span className={styles.infoValue}>Profile, tugas, dan forum dalam satu profile.</span>
          </div>
        </div>
      </section>
    </DashboardShell>
  )
}
