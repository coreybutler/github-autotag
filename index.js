'use strict'

const MustHave = require('musthave')
const mh = new MustHave()
const GitHubApi = require('github')
const http = require('https')

let github
let cfg
let mod = {
  auth: function () {
    // Authenticate
    mh.hasAll(cfg, 'user', 'pass')
    github.authenticate({
      type: "basic",
      username: cfg.user,
      password: cfg.pass
    })
  },

  monitor: function (config, callback) {
    cfg = config || {}
    cfg.branch = cfg.branch || 'master'

    // Make sure credentials are available
    mh.hasAll(cfg, 'user', 'pass', 'repo', 'email', 'before', 'after')

    cfg.repo = cfg.repo.replace(/\\/gi,'/')

    if (cfg.repo.split('/').length === 1) {
      cfg.repo = cfg.user + '/' + cfg.repo
    }

    // Initialize API Connection
    github = new GitHubApi({
      version: "3.0.0",
      debug: false,
      protocol: "https",
      host: "api.github.com",
      pathPrefix: "/",
      timeout: 5000,
      headers: {
        "user-agent": "node-github-autotag"
      }
    })

    github.repos.getCommit({
      user: cfg.repo.split('/')[0],
      repo: cfg.repo.split('/')[1],
      sha: cfg.after
    }, function (err, data) {
      if (err) {
        callback && callback
      }

      // Find the package.json
      console.log(data)
      let pkg = data.files.filter(function(f){
        return f.filename === 'package.json'
      })

      // If the package.json was not a part of the update,
      // there will be no need to create a new tag.
      if (pkg.length === 0) {
        callback && callback(null, false)
        return
      }
      pkg = pkg[0]

      // If the package.json was modified, check to see if there
      // is a new version or if the file was just added.
      switch (pkg.status.trim().toLowerCase()) {
        case 'added':
          console.log('New package.json detected. Retrieving version.')

          mod.getUrl(pkg.raw_url, function (res) {
            if (res.statusCode !== 200) {
              throw new Error('Could not retrieve package.json from ' + pkg.raw_url + ' (Status: ' + res.statusCode + ')')
            }
            let data = JSON.parse(res.body)
            mod.createTag(data.version, callback)
          })
          break
        case 'modified':
          mod.getUrl(pkg.raw_url, function (res) {
            if (res.statusCode !== 200) {
              throw new Error('Could not retrieve package.json from ' + pkg.raw_url + ' (Status: ' + res.statusCode + ')')
            }
            let data = JSON.parse(res.body)
            mod.createTag(data.version, callback)
          })
          break
        case 'deleted':
          throw new Error('The package.json file was removed! Perhaps this service shouldn\'t be running anymore? Perhaps this was a mistake?')
          break
      }
    })
  },

  createTag: function (tag, callback) {
    // First check to see if a tag exists for this
    github.repos.getTags({
      user: cfg.repo.split('/')[0],
      repo: cfg.repo.split('/')[1],
      per_page: 5
    }, function (err0, data) {
      if (err0) {
        callback && callback(err0)
        return
      }
      data = data.filter(function (t) {
        return t.name === tag
      })
      if (data.length === 0) {
        console.log('Creating tag for version', tag)
        mod.auth()
        let dt = (new Date()).toISOString().split('.')[0]
        let offset = (new Date()).getTimezoneOffset() / 60
        let dir = offset > 0
        offset = offset.toString().replace(/\+\-/gi,'')
        let partial = offset.split('.')
        partial = partial[1] || '00'
        partial = partial.length === 1 ? '0' + partial : partial
        offset = offset[0]
        offset = offset.length === 1 ? '0' + offset : offset
        offset = (!dir ? '+' : '-') + offset + ':' + partial

        github.gitdata.createTag({
          user: cfg.repo.split('/')[0],
          repo: cfg.repo.split('/')[1],
          tag: tag,
          message: 'Creating v' + tag,
          object: cfg.after,
          type: 'commit',
          tagger: {
            name: cfg.user,
            email: cfg.email,
            date: dt + offset
          }
        }, function (err, result) {
          if (err) {
            callback && callback(err)
            return
          }
          github.gitdata.createReference({
            user: cfg.repo.split('/')[0],
            repo: cfg.repo.split('/')[1],
            ref: 'refs/tags/' + tag,
            sha: result.sha
          }, function (err2, result2) {
            if (err2) {
              callback && callback(err2)
              return
            }
            callback && callback(null, tag)
          })
        })
      } else {
        callback && callback(null, false)
      }
    })
  },

  getUrl: function (url, callback) {
    let uri = require('url').parse(url)
    let options = {
      host: uri.hostname,
      port: uri.port,
      path: uri.path,
      method: 'GET'
    }

    let req = http.request(options, function (res) {
      let body = ""
      if (res.statusCode === 301 || res.statusCode === 302) {
        mod.getUrl(res.headers.location, callback)
      } else {
        res.setEncoding('utf8')
        res.on('data', function (chunk) {
          body += chunk
        })
        res.on('error', function (e) {
          throw new e
        })
        res.on('end', function () {
          res.body = body
          callback(res)
        })
      }
    })
    req.end()
  }
}

module.exports = mod
