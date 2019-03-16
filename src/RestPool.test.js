const tap = require('tap');
const {inspect} = require('util');
const {Subject} = require('rxjs');
const lGet = require('lodash.get');
const cloneDeep = require('lodash.clonedeep');

import {bottle} from './../lib';

tap.test('Pool', (suite) => {
    let RestPool;
    let Channel;
    let ducks;
    let ducksMap;
    let poolRunner;
    let nextId;
    let duckResolve;
    let IMPULSE_STATE_NEW;
    let IMPULSE_STATE_SENT;
    let IMPULSE_STATE_QUEUED;
    let IMPULSE_STATE_RESOLVED;
    let IMPULSE_STATE_ERROR;

    const beforeEach = (channels) => {
        const b = bottle();
        RestPool = b.container.RestPool;
        poolRunner = b.container.poolRunner;
        Channel = b.container.Channel;
        ducks = new RestPool('ducks', channels);
        ducksMap = new Map();
        nextId = 0;
        duckResolve = i => {
            let duck = {
                ...i.options,
                id: lGet(i, 'options.id', ++nextId),
            }

            ducksMap.set(duck.id, duck);
            return Promise.resolve(duck);
        };

        IMPULSE_STATE_NEW = b.container.IMPULSE_STATE_NEW;
        IMPULSE_STATE_SENT = b.container.IMPULSE_STATE_SENT;
        IMPULSE_STATE_RESOLVED = b.container.IMPULSE_STATE_RESOLVED;
        IMPULSE_STATE_ERROR = b.container.IMPULSE_STATE_ERROR;
        IMPULSE_STATE_QUEUED = b.container.IMPULSE_STATE_QUEUED;
    };



    suite.end();
});
