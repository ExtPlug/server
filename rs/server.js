const path = require('path')
const gh = require('gh-got')
const stringify = require('json-stringify-pretty-compact')
const body = require('raw-body')
const { json, send, createError } = require('micro')
const { authenticator, authRoute } = require('plug-auth-server')
const HostChecker = require('./HostChecker')

const ghToken = process.env.GITHUB_TOKEN
const ghRepo = 'extplug/faerss'

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

async function saveFile (room, user, filename, contents, message) {
  const url = `repos/${ghRepo}/contents/${room}/${filename}`

  const existingSha = await gh(url).then((response) => {
    if (response.body.type === 'file') return response.body.sha
    throw new Error('Invalid repository state. Please poke @ReAnna in the plug.dj Discord.')
  }, () => undefined)

  const { body } = await gh(url, {
    token: ghToken,
    method: 'PUT',
    body: {
      message: `[${room}] ${message}\n\nhttps://plug.dj/${room}`,
      author: {
        name: user.username,
        email: `user.${user.id}@extplug.com`
      },
      committer: {
        name: 'ExtPlug Bot',
        email: 'd@extplug.com'
      },
      content: Buffer.from(contents, 'utf8').toString('base64'),
      sha: existingSha
    }
  })

  return { sha: body.content.sha }
}

function saveRoomSettings (room, user, settings) {
  return saveFile(room, user, 'settings.json', stringify(settings),
    'Update room settings.')
}

function saveRoomStyles (room, user, cssText) {
  return saveFile(room, user, 'style.css', cssText,
    'Update room styles.')
}

async function getRoomSettings (room) {
  const url = `repos/${ghRepo}/contents/${room}/settings.json`

  const { body } = await gh(url, { token: ghToken })
  return JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'))
}

async function getRoomStyles (room) {
  const url = `repos/${ghRepo}/contents/${room}/style.css`

  const { body } = await gh(url, { token: ghToken })
  return Buffer.from(body.content, 'base64').toString('utf8')
}

const parseUrl = (url) => {
  const ext = path.extname(url)
  const roomName = url.slice(1)
  if (ext) {
    return { ext, roomName: path.parse(roomName).name }
  }
  return { roomName: roomName }
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

  const { ext, roomName } = parseUrl(req.url)

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
      const css = await body(req)
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
    if (ext === '.css') {
      res.setHeader('content-type', 'text/css')
      return getRoomStyles(roomName)
    }

    if (ext && ext !== '.json') {
      throw createError(404, 'Not Found')
    }

    return getRoomSettings(roomName).catch(() => emptyRoomSettings)
  }
}
