'use client'

import { type FormEvent, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { backendRequestJson } from '@/lib/backend'
import type { AppSession } from '@/lib/auth-types'
import styles from '@/app/profile/profile.module.css'

type ProfileEditorProps = {
  session: AppSession
}

export function ProfileEditor({ session }: ProfileEditorProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState(session.user.fullName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(session.user.avatarUrl ?? '')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    try {
      await backendRequestJson<{ redirectTo: string }>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          avatarUrl: avatarUrl.trim(),
        }),
      })

      setMessage('Profile tersimpan dan akan dipakai di semua peran.')
      startTransition(() => {
        router.refresh()
      })
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Gagal memperbarui profile.'
      )
    }
  }

  const handleReset = () => {
    setFullName(session.user.fullName ?? '')
    setAvatarUrl(session.user.avatarUrl ?? '')
    setError('')
    setMessage('')
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="profile-full-name">
          Nama Lengkap
        </label>
        <input
          id="profile-full-name"
          className={styles.input}
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Nama yang tampil di semua role"
          autoComplete="name"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="profile-avatar-url">
          Avatar URL
        </label>
        <input
          id="profile-avatar-url"
          className={styles.input}
          type="url"
          value={avatarUrl}
          onChange={(event) => setAvatarUrl(event.target.value)}
          placeholder="https://..."
          autoComplete="url"
        />
      </div>

      {error && <div className={styles.messageError}>{error}</div>}
      {message && <div className={styles.messageSuccess}>{message}</div>}

      <div className={styles.formActions}>
        <button type="button" className={styles.secondaryButton} onClick={handleReset}>
          Reset
        </button>
        <button type="submit" className={styles.primaryButton} disabled={isPending}>
          {isPending ? 'Menyimpan...' : 'Simpan Profile'}
        </button>
      </div>
    </form>
  )
}
