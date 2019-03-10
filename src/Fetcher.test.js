const tap = require('tap');
const Yup = require('yup');
const {inspect} = require('util');

import {bottle} from './../lib';

tap.test('Fetcher', (suite) => {
  let Fetcher;
  let f;
  const before = () => {
    const b = bottle();
    Fetcher = b.container.Fetcher;
    f = new Fetcher({
      name: 'ducks',
      schema: Yup.object().shape({
        id: Yup.number().positive().integer(),
        name: Yup.string().required(),
        note: Yup.string()
      }),
      data: [
        {id: 1, name: 'Howard', note: 'Marvelous'},
        {id: 2, name: 'Daffy'},
        {id: 3, name: 'Donald', note: 'Disney\'s duck'}
      ]
    });
  };

  suite.test('.get', (context) => {
    context.test('when present', contextGet => {
      before();
      f.get(2)
        .then((duck) => {
          // this is the expected result;
          contextGet.same(duck.fields.name, 'Daffy');
          contextGet.end();
        })
        .catch((err) => {
          contextGet.fail(err);
          contextGet.end();
        })
    });

    context.test('when not present', contextGetBad => {
      before();
      f.get(-2)
        .then((duck) => {
          contextGetBad.fail(new Error('getting -2 should be an error'));
          contextGetBad.same(duck.fields.name, 'Daffy');
          contextGetBad.end();
        })
        .catch((err) => {
          // this is the expected result
          contextGetBad.pass();
          contextGetBad.end();
        })
    });

    context.end();
  });

  suite.test('.put', (context) => {
    context.test('new record', async contextPutNew => {
      before();
      await f.put({id: 4, name: 'Scrooge', notes: 'Also Named Donald'});
      f.get(4)
        .then((duck) => {
          // this is the expected result;
          contextPutNew.same(duck.fields.name, 'Scrooge');
          contextPutNew.end();
        })
        .catch((err) => {
          contextPutNew.fail(err);
          contextPutNew.end();
        })
    });

    context.test('old record', async contextPutOld => {
      before();
      await f.put({id: 2, name: 'Donald', notes: 'Broke ass punk'});
      f.get(2)
        .then((duck) => {
          // this is the expected result;
          contextPutOld.same(duck.fields.name, 'Donald');
          contextPutOld.same(duck.fields.notes, 'Broke ass punk');
          contextPutOld.end();
        })
        .catch((err) => {
          contextPutOld.fail(err);
          contextPutOld.end();
        })
    });

    context.end();
  });

  suite.end();
});
