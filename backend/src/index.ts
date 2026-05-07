import { env } from './config/env'
import { createApp } from './app'

const app = createApp()

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend ready on http://localhost:${env.PORT}`)
  // eslint-disable-next-line no-console
  console.log(`Frontend origin: ${env.FRONTEND_URL}`)
})
