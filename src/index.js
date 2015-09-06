const express = require('express')
const request = require('request')
const cors = require('cors')

const PORT = process.env.EXTP_PORT || 34569

const app = express()

app.use(cors({ origin: 'https://plug.dj' }))
app.use(require('body-parser').urlencoded())
app.use(require('body-parser').json())
app.use(require('express-session')({ secret: 'secret' }))

app.use('/rs', require('./room-settings-proxy'))

app.listen(PORT, () => {
  console.info(`listening on ${PORT}`)
})
