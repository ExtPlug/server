const path = require('path')
const url = require('url')
const gh = require('gh-got')
const stringify = require('json-stringify-pretty-compact')
const body = require('raw-body')
const { json, send, createError } = require('micro')
const { authenticator, authRoute } = require('plug-auth-server')
const HostChecker = require('./HostChecker')
const compileCss = require('./compileCss')
const commit = require('./commit')

const ghToken = process.env.GITHUB_TOKEN
const ghRepo = 'extplug/faerss'

if (!ghToken) {
  throw new Error(`Must specify a Github API token with access to ${ghRepo} in the GITHUB_TOKEN environment variable.`)
}
if (!process.env.PLUG_EMAIL || !process.env.PLUG_PASSWORD) {
  throw new Error('Must specify plug.dj account credentials in the PLUG_EMAIL and PLUG_PASSWORD environment variables.')
}
if (!process.env.SECRET) {
  throw new Error('Must specify a session secret in the SECRET environment variable.')
}

const engine = authenticator({
  auth: { email: process.env.PLUG_EMAIL, password: process.env.PLUG_PASSWORD },
  secret: Buffer.from(process.env.SECRET, 'hex')
})

// Default room settings to use if a room host hasn't configured settings.
const emptyRoomSettings = {}

function cors (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const corsMethod = req.headers['access-control-request-method']
  if (corsMethod) res.setHeader('Access-Control-Allow-Methods', corsMethod)
  const corsHeaders = req.headers['access-control-request-headers']
  if (corsHeaders) res.setHeader('Access-Control-Allow-Headers', corsHeaders)
}

function tryAuthenticate (params, req, res) {
  if (params.stage === 'token') {
    return engine.getAuthBlurb(params.user)
  } else if (params.stage === 'verify') {
    try {
      return engine.verifyBlurb(params.user)
    } catch (err) {
      return send(res, 403, { status: 'fail', data: [err.message] })
    }
  }
  return send(res, 400, { status: 'fail', data: ['invalid stage'] })
}

const hostChecker = new HostChecker()
function assertUserIsHost (room, user) {
  return hostChecker.push({ room, user })
}

function getCommitMessage(room, user, message) {
  return `[${room}] ${message}\n\nhttps://plug.dj/${room}`
}

function saveRoomSettings (room, user, settings) {
  return commit(user, getCommitMessage(room, user, 'Update room settings.'), [
    { path: `${room}/settings.json`, content: stringify(settings) }
  ])
}

async function saveRoomStyles (room, user, cssText) {
  const result = await compileCss(cssText)

  return commit(user, getCommitMessage(room, user, 'Update room styles.'), [
    { path: `${room}/style.css`, content: cssText },
    { path: `${room}/style.min.css`, content: result.css },
  ])
}

async function getRoomFile (room, filename) {
  const url = `repos/${ghRepo}/contents/${room}/${filename}`

  const { body } = await gh(url, { token: ghToken })
  return Buffer.from(body.content, 'base64').toString('utf8')
}

async function getHistory (room) {
  const url = `repos/${ghRepo}/commits`
  const { body } = await gh(url, {
    token: ghToken,
    query: { path: room }
  })

  function getUserId (user) {
    return parseInt(user.email.replace(/^user\.(\d+)@extplug\.com$/, '$1'), 10)
  }

  return body.map((change) => ({
    id: change.sha,
    message: change.commit.message,
    user: getUserId(change.commit.author),
    time: new Date(change.commit.author.date).getTime()
  }))
}

const parseUrl = (reqUrl) => {
  const parts = url.parse(reqUrl)
  const ext = path.extname(parts.pathname)
  const roomName = parts.pathname.slice(1)
  if (ext) {
    Object.assign(parts, {
      ext,
      roomName: path.parse(roomName).name
    })
  } else {
    Object.assign(parts, { roomName: roomName })
  }

  if (/\/history$/.test(parts.roomName)) {
    parts.action = 'history'
    parts.roomName = parts.roomName.split('/')[0]
  }

  return parts
}

module.exports = async (req, res) => {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    return send(res, 204, null)
  }

  if (req.url === '/auth') {
    const params = await json(req)
    return tryAuthenticate(params, req, res)
  }

  const { ext, roomName, query, action } = parseUrl(req.url)

  if (!roomName) {
    return send(res, 404, null)
  }

  if (req.method === 'PUT') {
    const authHeader = req.headers.authorization
    if (!/^JWT /.test(authHeader)) {
      throw new Error('No authentication token received')
    }

    const user = await engine.verifyToken(authHeader.slice(4))
    await assertUserIsHost(roomName, user)

    if (ext === '.css') {
      const css = await body(req, { encoding: 'utf-8' })
      const result = await saveRoomStyles(roomName, user, css)

      return send(res, 200, result)
    }
    if (ext && ext !== '.json') {
      throw createError(403, 'You can only store CSS and JSON files.')
    }

    const params = await json(req)
    const result = await saveRoomSettings(roomName, user, params)

    return send(res, 200, result)
  }

  if (req.method === 'GET') {
    if (action === 'history') {
      return getHistory(roomName)
    }

    if (ext === '.css') {
      res.setHeader('content-type', 'text/css')
      return getRoomFile(roomName,
        // reanna.css?source returns the full source. Otherwise, return the
        // minified css.
        query === 'source' ? 'style.css' : 'style.min.css')
    }

    if (ext && ext !== '.json') {
      throw createError(404, 'Not Found')
    }

    return getRoomFile(roomName, 'settings.json').then(JSON.parse)
  }
}
