const request = require('request');

// _SUPER_ barebones proxy for room settings json
module.exports = (req, res) => {
  // chop off the leading slash
  const url = req.url.substr(1);

  res.set('content-type', 'application/json');

  request(url, {
    // we're fine with misconfigured servers
    rejectUnauthorized: false,
    headers: {
      'user-agent': 'ExtPlug Room Settings Proxy',
    },
  }).pipe(res);
};
