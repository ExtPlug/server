const gh = require('gh-got')
const Mutex = require('await-lock')

const ghToken = process.env.GITHUB_TOKEN
const ghRepo = 'extplug/faerss'

function createBlob (path, content) {
  return gh(`repos/${ghRepo}/git/blobs`, {
    token: ghToken,
    method: 'post',
    body: { path, content, encoding: 'utf-8' }
  }).then((res) => ({
    path,
    mode: '100644',
    type: 'blob',
    sha: res.body.sha
  }))
}

function getLatestCommit () {
  return gh(`repos/${ghRepo}/git/refs/heads/master`, { token: ghToken })
    .then((res) => res.body.object)
}

function getTree (commit) {
  return gh(`repos/${ghRepo}/git/commits/${commit.sha}`, { token: ghToken })
    .then((res) => res.body.tree)
}

async function getBaseTree () {
  const commit = await getLatestCommit()

  return {
    commit,
    tree: await getTree(commit)
  }
}

function createTree (baseTree, updates) {
  return gh(`repos/${ghRepo}/git/trees`, {
    token: ghToken,
    method: 'post',
    body: {
      base_tree: baseTree.sha,
      tree: updates
    }
  }).then((res) => res.body)
}

function createCommit (parent, newTree, message, author) {
  return gh(`repos/${ghRepo}/git/commits`, {
    token: ghToken,
    method: 'post',
    body: {
      message,
      tree: newTree.sha,
      parents: [
        parent.sha
      ],
      committer: {
        name: 'ExtPlug Bot',
        email: 'd@extplug.com'
      },
      author
    }
  }).then((res) => res.body)
}

function updateRef (ref, commit) {
  return gh(`repos/${ghRepo}/git/refs/${ref}`, {
    token: ghToken,
    method: 'patch',
    body: {
      sha: commit.sha
    }
  }).then((res) => res.body)
}

const lock = new Mutex()
module.exports = async function commit (user, message, files) {
  await lock.acquireAsync()

  try {
    const [ updates, base ] = await Promise.all([
      Promise.all(
        files.map((file) => createBlob(file.path, file.content))),
      getBaseTree()
    ])

    const newTree = await createTree(base.tree, updates)
    const newCommit = await createCommit(base.commit, newTree, message, {
      name: user.username,
      email: `user.${user.id}@extplug.com`
    })

    await updateRef('heads/master', newCommit)

    return newCommit.sha
  } catch (err) {
    if (err.response) console.error(err.response.body)
    throw err
  } finally {
    lock.release()
  }
}
