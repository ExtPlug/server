const cors = require('cors-anywhere')

cors.createServer({
  removeHeaders: [
    'cookie',
    'cookie2'
  ]
}).listen(process.env.PORT || 8080)
