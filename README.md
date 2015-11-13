# github-autotag

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
  branch: process.env.GITHUB_REPO_BRANCH // optional, defaults to master
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
