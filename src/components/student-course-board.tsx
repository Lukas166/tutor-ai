'use client'

import { type FormEvent, useState } from 'react'
import styles from '@/app/dashboard/dashboard.module.css'

type StudentCourse = {
  id: string
  title: string
  tokenLabel: string
  note: string
}

function maskToken(tokenValue: string) {
  const compactToken = tokenValue.replace(/\s+/g, '')

  if (compactToken.length <= 8) {
    return compactToken
  }

  return `${compactToken.slice(0, 4)}…${compactToken.slice(-4)}`
}

const boardSurfaceStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '22px',
} as const

const enrollFormStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
} as const

const inputRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: '12px',
} as const

const inputStyle = {
  width: '100%',
  padding: '13px 16px',
  border: '1.5px solid var(--unpad-gray)',
  borderRadius: '12px',
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  color: 'var(--unpad-text)',
  background: 'var(--unpad-off-white)',
  transition: 'all 0.2s ease',
  outline: 'none',
} as const

const submitButtonStyle = {
  border: 'none',
  borderRadius: '12px',
  padding: '0 18px',
  minWidth: '152px',
  background: 'linear-gradient(135deg, var(--unpad-blue) 0%, var(--unpad-mid-blue) 100%)',
  color: 'white',
  fontFamily: 'var(--font-body)',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  boxShadow: '0 4px 16px rgba(26, 75, 140, 0.22)',
} as const

const feedbackBaseStyle = {
  padding: '12px 14px',
  borderRadius: '12px',
  fontSize: '13px',
  lineHeight: 1.5,
} as const

const emptyStyle = {
  padding: '28px',
  borderRadius: '16px',
  border: '1px dashed var(--unpad-gray)',
  background: 'var(--unpad-off-white)',
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  color: 'var(--unpad-muted)',
} as const

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '16px',
} as const

const cardStyle = {
  borderRadius: '18px',
  padding: '20px',
  border: '1px solid #e4edf8',
  background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
  boxShadow: '0 1px 3px rgba(0, 33, 71, 0.06)',
} as const

const cardTopStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '14px',
} as const

const cardPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px 10px',
  borderRadius: '999px',
  background: 'rgba(26, 75, 140, 0.08)',
  color: 'var(--unpad-blue)',
  fontSize: '11px',
  fontWeight: 700,
  whiteSpace: 'nowrap',
} as const

const cardTextStyle = {
  fontSize: '13px',
  lineHeight: 1.6,
  color: 'var(--unpad-muted)',
} as const

const cardFooterStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  marginTop: '16px',
} as const

const chipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 10px',
  borderRadius: '999px',
  background: '#eef4fb',
  color: 'var(--unpad-text)',
  fontSize: '12px',
  fontWeight: 600,
} as const

export function StudentCourseBoard() {
  const [enrollmentToken, setEnrollmentToken] = useState('')
  const [courses, setCourses] = useState<StudentCourse[]>([])
  const [feedback, setFeedback] = useState('')
  const [hasError, setHasError] = useState(false)

  const handleEnroll = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedToken = enrollmentToken.trim()

    if (!normalizedToken) {
      setHasError(true)
      setFeedback('Token course wajib diisi.')
      return
    }

    const nextCourseIndex = courses.length + 1
    const tokenLabel = maskToken(normalizedToken)

    setCourses((currentCourses) => [
      {
        id: `${Date.now()}-${currentCourses.length + 1}`,
        title: `Mata Kuliah ${nextCourseIndex}`,
        tokenLabel,
        note: 'Preview frontend. Course ini akan disambungkan ke backend token nanti.',
      },
      ...currentCourses,
    ])
    setEnrollmentToken('')
    setHasError(false)
    setFeedback('Token diterima. Course ditambahkan sementara di frontend.')
  }

  const courseCount = courses.length

  const courseMetrics = [
    { label: 'Course aktif', value: String(courseCount), icon: '📘', color: '#1a4b8c' },
    { label: 'Token dipakai', value: String(courseCount), icon: '🔑', color: '#c9a227' },
    { label: 'Materi tersedia', value: '0', icon: '🗂️', color: '#16a34a' },
    { label: 'Tugas aktif', value: '0', icon: '📝', color: '#7c3aed' },
  ]

  return (
    <section className={styles.infoCard} style={boardSurfaceStyle}>
      <div className={styles.infoCardHeader}>
        <div className={styles.infoCardBadge}>LMS Mahasiswa</div>
        <h2>Pelajaran saya</h2>
      </div>

      <div className={styles.statsGrid}>
        {courseMetrics.map((metric) => (
          <div key={metric.label} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: `${metric.color}15`, color: metric.color }}>
              {metric.icon}
            </div>
            <div>
              <div className={styles.statValue}>{metric.value}</div>
              <div className={styles.statLabel}>{metric.label}</div>
            </div>
          </div>
        ))}
      </div>

      <form className={styles.infoCard} style={enrollFormStyle} onSubmit={handleEnroll}>
        <label htmlFor="course-token" style={{ fontSize: 13, fontWeight: 600, color: 'var(--unpad-text)' }}>
          Token course
        </label>
        <div style={inputRowStyle}>
          <input
            id="course-token"
            type="text"
            value={enrollmentToken}
            onChange={(event) => setEnrollmentToken(event.target.value)}
            placeholder="Masukkan token course"
            autoComplete="off"
            style={inputStyle}
          />
          <button
            type="submit"
            style={submitButtonStyle}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = 'translateY(-1px)'
              event.currentTarget.style.boxShadow = '0 6px 20px rgba(26, 75, 140, 0.3)'
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = 'translateY(0)'
              event.currentTarget.style.boxShadow = '0 4px 16px rgba(26, 75, 140, 0.22)'
            }}
          >
            Gabung Course
          </button>
        </div>
        {feedback ? (
          <div
            style={{
              ...feedbackBaseStyle,
              background: hasError ? '#fef2f2' : '#f0fdf4',
              border: hasError ? '1px solid #fecaca' : '1px solid #bbf7d0',
              color: hasError ? 'var(--unpad-error)' : 'var(--unpad-success)',
            }}
          >
            {feedback}
          </div>
        ) : null}
      </form>

      {courses.length === 0 ? (
        <div style={emptyStyle}>
          <strong style={{ color: 'var(--unpad-text)', fontSize: 14 }}>Belum ada pelajaran.</strong>
          <span>Masukkan token course untuk menambahkan kelas pertama.</span>
        </div>
      ) : (
        <div style={gridStyle}>
          {courses.map((course) => (
            <article key={course.id} style={cardStyle}>
              <div style={cardTopStyle}>
                <div>
                  <span style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: 'var(--unpad-blue)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {course.tokenLabel}
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--unpad-navy)', lineHeight: 1.2 }}>
                    {course.title}
                  </h3>
                </div>
                <span style={cardPillStyle}>Aktif</span>
              </div>
              <p style={cardTextStyle}>{course.note}</p>
              <div style={cardFooterStyle}>
                <span style={chipStyle}>Materi 0</span>
                <span style={chipStyle}>Tugas 0</span>
                <span style={chipStyle}>Forum 0</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}