#!/usr/bin/env node

const micro = require('micro')
const handler = require('./server')

const server = micro(handler)

server.on('error', err => {
  console.error('micro:', err.stack)
  process.exit(1)
})

server.listen(process.env.PORT || 8080, () => {
  const details = server.address()

  process.on('SIGTERM', () => {
    server.close(process.exit)
  })

  // `micro` is designed to run only in production, so
  // this message is perfectly for prod
  console.log(`micro: Accepting connections on port ${details.port}`)
})
