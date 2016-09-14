const request = require('request');

// _SUPER_ barebones proxy for room settings json
export default function (req, res) {
  // chop off the leading slash
  const url = req.url.substr(1);

  request.get({
    url,
    // we're fine with misconfigured servers
    rejectUnauthorized: false,
    headers: {
      'user-agent': 'ExtPlug Room Settings Proxy',
    },
  })
    .on('response', (targetRes) => {
      // some room settings don't set their content types properly
      // eslint-disable-next-line no-param-reassign
      targetRes.headers['content-type'] = 'application/json';
    })
    .pipe(res);
}
