# Github Autotag Utility

Monitor package.json for version changes and auto-tag new releases.

`npm install github-autotag`

## Overview

This module was designed to help automatically create new tags for npm modules (or anything using package.json).
At [Ecor Ventures](http://ecorventures.com), we use [Travis-CI](http://travis-ci.org) to unit test our open source
modules and deploy them. Travis can be configured to watch for new Github tags and automatically create a release
from the new tag. Other services, such as [jsdelivr](http://github.com/jsdelivr/jsdelivr) will automatically update
based on releases. We also use webhooks to respond to new releases and publish npm updates.

To do this, we use this module as part of an [iron.io](http://iron.io) worker. Once the worker is uploaded to iron.io,
we point a Github webhook to the worker URL. When a new commit/merge is detected, the iron.io script is triggered.

## Usage

```js
var AutoTagger = require('github-autotag')

AutoTagger.monitor({
  repo: process.env.GITHUB_REPO,
  user: process.env.GITHUB_USER,
  pass: process.env.GITHUB_PASSWORD,
  email: process.env.EMAIL, // This is required to create a new tag
  before: 'original SHA', // See below
  after: 'commit SHA', // See below
  branch: process.env.GITHUB_REPO_BRANCH, // optional, defaults to master
}, function (err, tag) {
  if (err) {
    console.error(err)
  } else if (tag) {
    console.log('New tag created:', tag)
  } else {
    console.log('No update necessary.')
  }
})
```

## SHA values?

The SHA values are typically delivered in the payload of a webhook. For example:

```js
{
  "ref": "refs/heads/master",
  "before": "911eb1d755776f31bbf1bda4d798317ea6cdf907",
  "after": "067ac29825b69a2abd9f5ce5ef2795434b700ea1",
  "created": false,
  "deleted": false,
  "forced": false,
  "base_ref": null,
  "compare": "https://github.com/coreybutler/github-autotag/compare/911eb1d75577...067ac29825b6",
  "commits": [
    {
      "id": "067ac29825b69a2abd9f5ce5ef2795434b700ea1",
      "distinct": true,
      "message": "Test code",
      "timestamp": "2015-11-13T17:49:09-06:00",
      "url": "https://github.com/coreybutler/github-autotag/commit/067ac29825b69a2abd9f5ce5ef2795434b700ea1",
      "author": {
        "name": "Corey Butler"
      }
    }
  ]
}
```

The `before` and `after` contain the values necessary to identify package.json version updates.

# Create a Worker

We use the following code as an iron.io worker.

```js
var worker = require('iron_worker')
var payload = worker.params()
var cfg = worker.config()
var AutoTagger = require('github-autotag')

if (payload.ref.indexOf('refs/tags/') >= 0) {
  console.log('IGNORED:')
  console.log('This commit is a tag. No need to tag it again.')
  return
}

AutoTagger.monitor({
  repo: payload.repository.full_name,
  user: cfg.GITHUB_USER,
  pass: cfg.GITHUB_PASSWORD,
  email: cfg.EMAIL,
  before: payload.before,
  after: payload.after
}, function (err, tag) {
  if (err) {
    console.error(err)
  } else if (tag) {
    console.log('New tag created:', tag)
  } else {
    console.log('No update necessary.')
  }
})
```

To use this, acquire the iron.io webhook link and add it to your Github repo webhooks (Push only).

### Example

Check out [NGN Chassis](http://github.com/ngnjs/chassis-lib) as an example of how we use this.
NGN Chassis uses Travis-CI to run tests. It is also capable of monitoring Github tags that
conform to semantic versioning. As a result, we are able to use github-autotag to run as a
part of Travis CI process. When github-autotag creates the new version tag, the Travis CI 
deployment process automatically creates a new Github release. This in turn is recognized by
the jsdelivr CDN, which updates the CDN.

It's kind of a game of dominoes, but it completely automates the CI/CD process for us.