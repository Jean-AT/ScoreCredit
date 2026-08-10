import { createApp } from './infrastructure/http/app.js'
import { env } from './config/env.js'

const app = createApp()

const server = app.listen(env.PORT, () => {
  console.log(`BodegaScore AI listening on http://localhost:${env.PORT}`)
})

function shutdown(signal: string): void {
  console.log(`Received ${signal}, shutting down`)
  server.close(() => process.exit(0))
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
