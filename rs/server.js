const gh = require('gh-got')
const pify = require('pify')
const { json, send } = require('micro')
const { authenticator, authRoute } = require('plug-auth-server')

const engine = authenticator({
  auth: { email: process.env.PLUG_EMAIL, password: process.env.PLUG_PASSWORD },
  secret: Buffer.from(process.env.SECRET, 'hex')
})

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

function assertUserIsHost (room, user) {
  // TODO
  return Promise.resolve()
}

function saveRoomSettings (room, settings) {
  // TODO (put that shi in git)
  return Promise.resolve()
}

module.exports = async (req, res) => {
  cors(req, res)
  if (req.method === 'OPTIONS') {
    return send(res, 204, null)
  }

  const params = await json(req)
  if (req.url === '/auth') {
    return tryAuthenticate(params, req, res)
  }

  if (req.method === 'PUT') {
    const authHeader = req.headers.authorization
    if (!/^JWT /.test(authHeader)) {
      throw new Error('No authentication token received')
    }

    const roomName = req.url.slice(1)

    const user = await engine.verifyToken(authHeader.slice(4))
    await assertUserIsHost(roomName, user)
    await saveRoomSettings(roomName, params)

    return send(res, 200, params.settings)
  }
}
