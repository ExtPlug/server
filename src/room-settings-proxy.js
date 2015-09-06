const request = require('request')

// _SUPER_ barebones proxy for room settings json
export default function (req, res) {

  // chop off the leading slash
  let url = req.url.substr(1)

  request.get({ url: url
                // we're fine with misconfigured servers
              , rejectUnauthorized: false
              , headers:
                { 'user-agent': 'ExtPlug Room Settings Proxy' } })
    .on('response', res => {
      // some room settings don't set their content types properly
      res.headers['content-type'] = 'application/json'
    })
    .pipe(res)

}
