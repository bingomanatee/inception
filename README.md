# carpenter

[![Travis][build-badge]][build]
[![npm package][npm-badge]][npm]
[![Coveralls][coveralls-badge]][coveralls]

Ripple is a different interperetation of the ActiveRecord pattern. 
The concpet here is that you may have Collections - things which have data - that send signals to 
other collections (which may be a facade for a REST endpoint) that "I want a {action: thing}".

Then, you get a Signal instance which is a "Subscription" to the remote system that says
"When the remote collection emits a signal that satisfies me, I will send it out of my stream."

It may do this once or many times. For instance if one signal watches a record, then another 
signal deletes it, then the first signal might get feedback from either signals in either order.

You might get a signal of data from your request, THEN information that the record was deleted, in that order.

OR

you might get information that the record was deleted, THEN a 404. (or maybe not depending on how the systems are coded)

Similarly if you get a single record, then send a series of updates to that record you might get update signals
from the first signal every time. OR if you get a series of records and a third party has updated that record,
you might get informed laterally of that update.

Get's are signals. Put's are signals. Delete's are signals. The point being, every signal implies an interest in
one or more records AND/OR the execution of an operation. 

As signals are RxJS Observers, you can unsubscribe at any time, releasing the observation of the action. 
If for instance you delete a record, once you have validation that it's been deleted, you probably want to unsub and
stop caring about that record. 

[build-badge]: https://img.shields.io/travis/user/repo/master.png?style=flat-square
[build]: https://travis-ci.org/user/repo

[npm-badge]: https://img.shields.io/npm/v/npm-package.png?style=flat-square
[npm]: https://www.npmjs.org/package/npm-package

[coveralls-badge]: https://img.shields.io/coveralls/user/repo/master.png?style=flat-square
[coveralls]: https://coveralls.io/github/user/repo
