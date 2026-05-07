import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { ProfileEditor } from '@/components/profile-editor'
import { getDisplayName, getRoleGroupLabel, getRoleLabel } from '@/lib/auth-types'
import { getServerSession } from '@/lib/session'
import styles from './profile.module.css'

export default async function ProfilePage() {
  const session = await getServerSession()

  if (!session) {
    redirect('/login')
  }

  const displayName = getDisplayName(session.user.fullName, session.user.email)

  return (
    <DashboardShell
      session={session}
      active="profile"
      title="Profile Terpadu"
      subtitle="Satu profile dipakai oleh mahasiswa, dosen, dan admin di backend token yang sama."
    >
      <div className={styles.layout}>
        <section className={styles.editorCard}>
          <div className={styles.cardHeader}>
            <div className={styles.badgeRow}>
              <span className={styles.badge}>Profile utama</span>
              <span className={styles.badgeMuted}>Satu identitas untuk semua role</span>
            </div>
            <h2 className={styles.cardTitle}>Ubah nama dan avatar</h2>
            <p className={styles.cardDescription}>
              Perubahan di halaman ini akan dipakai pada semua dashboard role karena data profile
              disimpan satu kali di backend.
            </p>
          </div>

          <ProfileEditor session={session} />
        </section>

        <aside className={styles.summaryCard}>
          <div className={styles.cardHeader}>
            <div className={styles.badgeRow}>
              <span className={styles.badge}>Ringkasan akun</span>
              <span className={styles.badgeMuted}>{getRoleGroupLabel(session.user.roleGroup)}</span>
            </div>
            <h2 className={styles.cardTitle}>{displayName}</h2>
            <p className={styles.cardDescription}>
              Role aktif sekarang: {getRoleLabel(session.user.role)}.
            </p>
          </div>

          <div className={styles.summaryList}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>User ID</span>
              <span className={styles.summaryValue}>{session.user.id}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Email</span>
              <span className={styles.summaryValue}>{session.user.email}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Role group</span>
              <span className={styles.summaryValue}>{getRoleGroupLabel(session.user.roleGroup)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Profile dibuat</span>
              <span className={styles.summaryValue}>
                {new Date(session.profile.created_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </DashboardShell>
  )
}
