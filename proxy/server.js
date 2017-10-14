const cors = require('cors-anywhere')
const path = require('path')

cors.createServer({
  helpFile: path.join(__dirname, 'help.txt'),
  removeHeaders: [
    'cookie',
    'cookie2'
  ]
}).listen(process.env.PORT || 8080)
