'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const supabase = createClient()

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setSuccess('Cek email Anda untuk konfirmasi pendaftaran.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('Email atau password salah. Silakan coba lagi.')
      } else {
        window.location.href = '/dashboard'
      }
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
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
              Learning<br />
              Innovation &<br />
              <em>Virtual Education</em>
            </h1>
            <p className={styles.heroDesc}>
              Platform pembelajaran digital resmi Universitas Padjadjaran. 
              Raih ilmu tanpa batas, kapan saja dan di mana saja.
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
              {isSignUp ? 'Buat Akun Baru' : 'Selamat Datang'}
            </h2>
            <p className={styles.formSubtitle}>
              {isSignUp
                ? 'Daftarkan diri Anda untuk mulai belajar'
                : 'Masuk ke akun Tutor-AI Unpad Anda'}
            </p>
          </div>

          {/* Google OAuth Button */}
          <button
            className={styles.googleBtn}
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            type="button"
          >
            {googleLoading ? (
              <span className={styles.spinner} />
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span>
              {googleLoading
                ? 'Menghubungkan...'
                : `${isSignUp ? 'Daftar' : 'Masuk'} dengan Google`}
            </span>
          </button>

          <div className={styles.divider}>
            <span>atau dengan email</span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className={styles.form}>
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
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
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

            {!isSignUp && (
              <div className={styles.forgotRow}>
                <a href="#" className={styles.forgotLink}>Lupa password?</a>
              </div>
            )}

            {error && (
              <div className={styles.errorBox}>
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                  <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 6v4M10 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className={styles.successBox}>
                <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
                  <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M6.5 10.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {success}
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
                <span>{isSignUp ? 'Buat Akun' : 'Masuk ke Tutor-AI'}</span>
              )}
            </button>
          </form>

          <p className={styles.switchText}>
            {isSignUp ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button
              className={styles.switchBtn}
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError('')
                setSuccess('')
              }}
              type="button"
            >
              {isSignUp ? 'Masuk di sini' : 'Daftar sekarang'}
            </button>
          </p>

          <p className={styles.terms}>
            Dengan masuk, Anda menyetujui{' '}
            <a href="#">Ketentuan Layanan</a> dan{' '}
            <a href="#">Kebijakan Privasi</a> Universitas Padjadjaran.
          </p>
        </div>
      </main>
    </div>
  )
}