const createRouter = require('router');
const npmKeyword = require('npm-keyword');
const request = require('request');
const resolve = require('url').resolve;

function getFullUrl(req) {
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  return /\/$/.test(url) ? url : `${url}/`;
}

module.exports = () => {
  const router = createRouter();

  router.get('/', (req, res, next) => {
    const baseUrl = getFullUrl(req);
    npmKeyword('extplug-plugin')
      .then(packages =>
        packages.map(({ name, description }) => ({
          package: name,
          name: name.replace(/^extplug-/, ''),
          description,
          url: resolve(baseUrl, name),
        }))
      )
      .then(json => res.json(json))
      .catch(next);
  });

  router.get('/:name', (req, res, next) => {
    res.set('content-type', 'application/json');
    request(`https://unpkg.com/${req.params.name}`)
      .on('error', next)
      .pipe(res);
  });

  return router;
};
