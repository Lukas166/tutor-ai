const defaultBackendUrl = 'http://localhost:4000'

export const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? defaultBackendUrl

export function getBackendUrl(path: string) {
  return new URL(path, backendUrl).toString()
}

export async function backendRequestJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(getBackendUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : 'Permintaan gagal.'
    throw new Error(message)
  }

  return data as T
}
