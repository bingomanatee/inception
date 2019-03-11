const tap = require('tap');
const {inspect} = require('util');
const {Subject} = require('rxjs');

import {bottle} from './../lib';

tap.test('Collection', (suite) => {
  let Collection;
  let ducks;
  const beforeEach = () => {
    const b = bottle();
    Collection = b.container.Collection;
    ducks = new Collection('ducks', {
      idName: 'id',
      data: [
        {id: 1, name: 'Howard', note: 'Marvelous'},
        {id: 2, name: 'Daffy'},
        {id: 3, name: 'Donald', note: 'Disney\'s duck'}
      ]
    });
  };

  suite.test('.get', (testGet) => {
    testGet.test('(record that exists)', (testGetExists) => {
      beforeEach();

      let daffySignal = ducks.get(2);

      testGetExists.same(daffySignal.action, {do: 'get', where: {id: 2}});

      const results = [];
      daffySignal.subscribe(({data}) => {
        if (data) {
          results.push(data.map(d => d.toJSON()));
        }
      });
      testGetExists.same(results, []);
      daffySignal.perform();
      testGetExists.same(results, [
        [{fields: {id: 2, name: 'Daffy'}, collection: 'ducks'}]
      ]);

      testGetExists.end();
    });

    testGet.test('(record that does not exist)', (testGetExists) => {
      beforeEach();

      let daffySignal = ducks.get(4);

      testGetExists.same(daffySignal.action, {do: 'get', where: {id: 4}});

      const results = [];
      daffySignal.subscribe((message) => {
        const {error, data} = message;
        if (data) {
          results.push(data.toJSON());
        }
        else if (error) {
          results.push({error: error.message});
        }
      });
      testGetExists.same(results, []);
      daffySignal.perform();
      testGetExists.same(results, [{
        error: 'record not found'
      }]);

      testGetExists.end();
    });

    testGet.end();
  });

  suite.end();
});
