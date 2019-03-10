# carpenter

[![Travis][build-badge]][build]
[![npm package][npm-badge]][npm]
[![Coveralls][coveralls-badge]][coveralls]

Carpenter is a stream based ActiveRecord system. On its face its a conventional streaming system. 

Under the hood, every change it manages streams through to the model system, so that if one record changes,
any data retrieved by it (optionally) gets streamed updates so that other loaded data or data in progress
can update to the latest version of the dataset -- or re-poll itself to get more current information. 

[build-badge]: https://img.shields.io/travis/user/repo/master.png?style=flat-square
[build]: https://travis-ci.org/user/repo

[npm-badge]: https://img.shields.io/npm/v/npm-package.png?style=flat-square
[npm]: https://www.npmjs.org/package/npm-package

[coveralls-badge]: https://img.shields.io/coveralls/user/repo/master.png?style=flat-square
[coveralls]: https://coveralls.io/github/user/repo
