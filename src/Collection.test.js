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

      daffySignal.subscribe((message) => {
        const {data, error} = message;
        if (data) {
          results.push(data.map(d => d.toJSON()));
        }
        else if (error) {
          results.push({error: error.message});
        }
      });

      testGetExists.same(results, []);
      daffySignal.perform();
      testGetExists.same(results, [
        [{fields: {id: 2, name: 'Daffy'}, collection: 'ducks'}]
      ]);

      testGetExists.end();
    });

    testGet.test('multiple signals -- (record that exists)', (testGetExists) => {
      beforeEach();

      let daffySignal = ducks.get(2);
      let donaldSignal = ducks.get(3);

      testGetExists.same(daffySignal.action, {do: 'get', where: {id: 2}});

      const donaldResults = [];

      donaldSignal.subscribe((message) => {
        const {data, error} = message;
        if (data) {
          donaldResults.push(data.map(d => d.toJSON()));
        }
        else if (error) {
          donaldResults.push({error: error.message});
        }
      });

      const daffyResults = [];

      daffySignal.subscribe((message) => {
        const {data, error} = message;
        if (data) {
          daffyResults.push(data.map(d => d.toJSON()));
        }
        else if (error) {
          daffyResults.push({error: error.message});
        }
      });



      testGetExists.same(daffyResults, []);
      testGetExists.same(donaldResults, []);
      daffySignal.perform();
      donaldSignal.perform();
      testGetExists.same(daffyResults, [
        [{fields: {id: 2, name: 'Daffy'}, collection: 'ducks'}]
      ]);
      testGetExists.same(donaldResults, [
        [{fields: {id: 3, name: 'Donald', note: 'Disney\'s duck'}, collection: 'ducks'}]
      ]);

      testGetExists.end();
    });

    testGet.test('(record that does not exist)', (testGetExists) => {
      beforeEach();

      let daffySignal = ducks.get(4);

      testGetExists.same(daffySignal.action, {do: 'get', where: {id: 4}});

      const results = [];
      daffySignal.subscribe((message) => {
        const {data, error} = message;
        if (data) {
          results.push(data.map(d => d.toJSON()));
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
