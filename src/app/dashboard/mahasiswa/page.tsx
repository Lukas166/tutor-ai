import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { StudentCourseBoard } from '@/components/student-course-board'
import { getDisplayName, getGuestSession } from '@/lib/auth-types'
import { getServerSession } from '@/lib/session'
import styles from '../dashboard.module.css'

export default async function MahasiswaDashboardPage() {
  const session = (await getServerSession()) ?? getGuestSession('mahasiswa')

  if (session.user.roleGroup !== 'mahasiswa') {
    redirect('/dashboard/staff')
  }

  const displayName = getDisplayName(session.user.fullName, session.user.email)

  return (
    <DashboardShell
      session={session}
      active="dashboard"
      title="Dashboard Mahasiswa"
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

      <StudentCourseBoard />
    </DashboardShell>
  )
}
