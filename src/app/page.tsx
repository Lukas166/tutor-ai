import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getDashboardPath } from '@/lib/auth-types'
import { getServerSession } from '@/lib/session'

export default async function Home() {
  const session = await getServerSession()

  if (session) {
    redirect(getDashboardPath(session.user.role))
  }

  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fbff 0%, #e4edf8 100%)',
      padding: '20px',
      fontFamily: 'var(--font-body, sans-serif)'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        textAlign: 'center',
        padding: '40px',
        background: 'white',
        borderRadius: '32px',
        boxShadow: '0 20px 50px rgba(0, 33, 71, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'var(--unpad-blue, #1a4b8c)',
            marginBottom: '20px'
          }}>
            <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
              <circle cx="20" cy="20" r="19" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <path d="M10 28 L20 10 L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="20" cy="20" r="3" fill="rgba(201,162,39,0.9)" />
            </svg>
          </div>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 800, 
            color: 'var(--unpad-navy, #002147)',
            marginBottom: '12px'
          }}>
            Tutor-AI Unpad
          </h1>
          <p style={{ color: 'var(--unpad-muted, #64748b)', fontSize: '16px', lineHeight: 1.6 }}>
            Akses dashboard pembelajaran cerdas Unpad.<br/>
            Silakan pilih dashboard untuk mulai menjelajah tanpa login.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '20px' 
        }}>
          <Link href="/dashboard/mahasiswa" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '32px',
              borderRadius: '24px',
              border: '2px solid #e2e8f0',
              textAlign: 'left',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'white'
            }}
            >
              <div style={{ fontSize: '32px' }}>🎓</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--unpad-navy, #002147)' }}>Mahasiswa</h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Lihat materi kuliah, kumpulkan tugas, dan akses fitur pembelajaran mahasiswa lainnya.
              </p>
              <div style={{ marginTop: 'auto', color: 'var(--unpad-blue, #1a4b8c)', fontWeight: 600, fontSize: '14px' }}>
                Buka Dashboard →
              </div>
            </div>
          </Link>

          <Link href="/dashboard/staff" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '32px',
              borderRadius: '24px',
              border: '2px solid #e2e8f0',
              textAlign: 'left',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'white'
            }}
            >
              <div style={{ fontSize: '32px' }}>👔</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--unpad-navy, #002147)' }}>Dosen / Admin</h3>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                Kelola materi, evaluasi tugas mahasiswa, dan akses alat administrasi akademik.
              </p>
              <div style={{ marginTop: 'auto', color: 'var(--unpad-blue, #1a4b8c)', fontWeight: 600, fontSize: '14px' }}>
                Buka Dashboard →
              </div>
            </div>
          </Link>
        </div>

        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
            Sudah punya akun?
          </p>
          <Link href="/login" style={{
            display: 'inline-block',
            padding: '12px 32px',
            background: 'var(--unpad-blue, #1a4b8c)',
            color: 'white',
            borderRadius: '12px',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'opacity 0.2s ease'
          }}>
            Masuk ke Akun
          </Link>
        </div>
      </div>
    </main>
  )
}