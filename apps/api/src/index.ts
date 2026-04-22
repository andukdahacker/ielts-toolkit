import { buildApp } from './app.js'

async function start() {
  const app = await buildApp()
  const port = app.config.PORT

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully`)
    await app.close()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  try {
    await app.listen({ host: '::', port })
    app.log.info(`Server listening on port ${port}`)
  } catch (err) {
    app.log.fatal(err, 'Failed to start server')
    process.exit(1)
  }
}

start()
