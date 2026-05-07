import cors from 'cors'
import cookieParser from 'cookie-parser'
import express, { type NextFunction, type Request, type Response } from 'express'
import { env } from './config/env'
import { authRouter } from './routes/auth'
import { healthRouter } from './routes/health'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  )
  app.use(express.json())
  app.use(cookieParser())

  app.get('/', (_req, res) => {
    return res.status(200).json({ ok: true, service: 'tutor-ai-backend' })
  })
  app.use('/health', healthRouter)
  app.use('/auth', authRouter)

  app.use((_req, res) => {
    return res.status(404).json({ message: 'Endpoint tidak ditemukan.' })
  })

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan server.'
    return res.status(500).json({ message })
  })

  return app
}
