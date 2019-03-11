const tap = require('tap');
const {inspect} = require('util');
const {Subject} = require('rxjs');

import {bottle} from './../lib';

tap.test('rxCatch', (suite) => {
  let rxCatch;
  const beforeEach = () => {
    const b = bottle();
    rxCatch = b.container.rxCatch;
  };
  suite.test('(parametric)', (testParam) => {
    beforeEach();
    const s = new Subject();

    const bs = rxCatch(s, (x) => {
      let sqrt = Math.sqrt(x);
      if (isNaN(sqrt)) {
        throw new Error('not a number');
      }
      return sqrt;
    }, (err) => {
      return {error: 'sqrt failed', message: err.message}
    });

    let result = [];

    bs.subscribe(
      (n) => result.push(n),
      e => result.push({__error: e}),
      d => result.push('done')
    );

    s.next(9);
    s.next(4);
    s.next(0);
    s.next(-4);
    s.next(16);
    s.complete();
    testParam.same(result,
      [
        3,
        2,
        0,
        {
          "error": "sqrt failed",
          "message": "not a number"
        },
        4,
        "done"
      ]);
    testParam.end();
  });

  suite.end();
});
