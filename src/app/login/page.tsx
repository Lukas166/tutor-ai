'use client'

import { type FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { backendRequestJson } from '@/lib/backend'
import type { AppSession } from '@/lib/auth-types'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()

  const handleEmailAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await backendRequestJson<{ redirectTo: string; session: AppSession }>(
        isRegister ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(
            isRegister
              ? { email, password, fullName: fullName.trim() }
              : { email, password }
          ),
        }
      )

      router.replace(response.redirectTo)
      router.refresh()
    } catch (authenticationError) {
      setError(
        authenticationError instanceof Error
          ? authenticationError.message
          : 'Autentikasi gagal. Silakan coba lagi.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.root}>
      {/* Decorative background */}
      <div className={styles.bg}>
        <div className={styles.bgMesh} />
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />
        <div className={styles.bgPattern} />
      </div>

      {/* Left panel – branding */}
      <aside className={styles.panel}>
        <div className={styles.panelInner}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="19" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
                <path d="M10 28 L20 10 L30 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.5 22 L26.5 22" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="20" cy="20" r="3" fill="rgba(201,162,39,0.9)"/>
              </svg>
            </div>
            <div>
              <span className={styles.logoName}>Tutor-AI</span>
              <span className={styles.logoSub}>Unpad</span>
            </div>
          </div>

          <div className={styles.hero}>
            <h1 className={styles.heroTitle}>
              Satu akun,<br />
              tiga peran,<br />
              <em>satu profile</em>
            </h1>
            <p className={styles.heroDesc}>
              Platform belajar yang memisahkan akses mahasiswa, dosen, dan admin
              lewat token yang dikelola backend TypeScript.
            </p>
          </div>

          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statNum}>50K+</span>
              <span className={styles.statLabel}>Mahasiswa Aktif</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>800+</span>
              <span className={styles.statLabel}>Mata Kuliah</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statNum}>120+</span>
              <span className={styles.statLabel}>Program Studi</span>
            </div>
          </div>

          <div className={styles.panelFooter}>
            <span>© 2025 Universitas Padjadjaran</span>
          </div>
        </div>
      </aside>

      {/* Right panel – form */}
      <main className={styles.formSide}>
        <div className={styles.formCard}>
          {/* Mobile logo */}
          <div className={styles.mobileLogo}>
            <div className={styles.mobileLogoMark}>
              <svg viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="19" stroke="rgba(26,75,140,0.3)" strokeWidth="1.5"/>
                <path d="M10 28 L20 10 L30 28" stroke="#1a4b8c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.5 22 L26.5 22" stroke="rgba(26,75,140,0.5)" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="20" cy="20" r="3" fill="#c9a227"/>
              </svg>
            </div>
            <div>
              <span className={styles.mobileLogoName}>Tutor-AI</span>
              <span className={styles.mobileLogoSub}> Unpad</span>
            </div>
          </div>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>
              {isRegister ? 'Buat Akun Baru' : 'Selamat Datang'}
            </h2>
            <p className={styles.formSubtitle}>
              {isRegister
                ? 'Akun baru dibuat sebagai mahasiswa. Role staff disesuaikan lewat profile dan SQL.'
                : 'Masuk ke akun Tutor-AI yang terhubung ke satu profile.'}
            </p>
            <p className={styles.modeNote}>
              {isRegister
                ? 'Gunakan akun mahasiswa untuk registrasi mandiri.'
                : 'Admin dan dosen memakai jalur autentikasi yang sama, lalu diarahkan ke halaman staff.'}
            </p>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className={styles.form}>
            {isRegister && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="fullName">
                  Nama Lengkap
                </label>
                <div className={styles.inputWrap}>
                  <svg className={styles.inputIcon} viewBox="0 0 20 20" fill="none">
                    <path d="M10 10.5a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3.5 17a6.5 6.5 0 0113 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <input
                    id="fullName"
                    type="text"
                    className={styles.input}
                    placeholder="Nama lengkap Anda"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required={isRegister}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email Institusi
              </label>
              <div className={styles.inputWrap}>
                <svg className={styles.inputIcon} viewBox="0 0 20 20" fill="none">
                  <path d="M2.5 5.5L10 11l7.5-5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <rect x="1.5" y="4" width="17" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  className={styles.input}
                  placeholder="mahasiswa@unpad.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <div className={styles.inputWrap}>
                <svg className={styles.inputIcon} viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="9" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  placeholder="Minimal 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
                      <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className={styles.errorBox}>
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                  <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 6v4M10 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinnerWhite} />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>{isRegister ? 'Buat Akun Mahasiswa' : 'Masuk ke Tutor-AI'}</span>
              )}
            </button>
          </form>

          <p className={styles.switchText}>
            {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button
              className={styles.switchBtn}
              onClick={() => {
                setIsRegister(!isRegister)
                setError('')
              }}
              type="button"
            >
              {isRegister ? 'Masuk di sini' : 'Daftar mahasiswa'}
            </button>
          </p>

          <p className={styles.terms}>
            Dengan masuk, Anda menyetujui kebijakan akses data profile terpusat
            yang berlaku untuk semua role.
          </p>
        </div>
      </main>
    </div>
  )
}