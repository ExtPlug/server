const postcss = require('postcss')
const safe = require('postcss-safe-parser')
const cssnext = require('postcss-cssnext')
const cssnano = require('cssnano')

const plugins = [
  cssnext(),
  cssnano({
    autoprefixer: false,
    safe: true
  })
]

module.exports = async function compileCss (text) {
  const processor = postcss(plugins)
  const result = await processor.process(text, {
    parser: safe
  })

  return result
}
