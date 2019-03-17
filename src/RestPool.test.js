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

    let IMPULSE_STATE_NEW;
    let IMPULSE_STATE_SENT;
    let IMPULSE_STATE_QUEUED;
    let IMPULSE_STATE_RESOLVED;
    let IMPULSE_STATE_ERROR;
    let mockRest;
    let ROOT_URL;
    let UNSET;

    const beforeEach = (channels) => {
        const b = bottle();
        RestPool = b.container.RestPool;
        poolRunner = b.container.poolRunner;
        Channel = b.container.Channel;
        ducksMap = new Map();
        ROOT_URL = 'http://www.ducks.com/';
        UNSET = b.container.UNSET;

        mockRest = {
            get(url) {
                const id = parseInt(url.substr(ROOT_URL.length));
                if (isNaN(id)) {
                    throw {
                        status: 500,
                        body: 'not a number ' + url
                    }
                }
                if (!ducksMap.has(id)) {
                    throw {
                        status: 404,
                        body: 'not found'
                    }
                }

                return Promise.resolve({
                    status: 200,
                    data: ducksMap.get(id)
                });
            },
            put(url, duck) {
                const id = parseInt(url.substr(ROOT_URL.length));
                if (isNaN(id)) {
                    throw {
                        status: 500,
                        body: 'not a number ' + url
                    }
                }

                ducksMap.set(id, duck);

                return Promise.resolve({
                    status: 200,
                    data: duck
                })
            }
        };

        ducks = new RestPool('ducks', {
            fetcher: mockRest,
            rootURL: 'http://www.ducks.com'
        });
        nextId = 0;

        IMPULSE_STATE_NEW = b.container.IMPULSE_STATE_NEW;
        IMPULSE_STATE_SENT = b.container.IMPULSE_STATE_SENT;
        IMPULSE_STATE_RESOLVED = b.container.IMPULSE_STATE_RESOLVED;
        IMPULSE_STATE_ERROR = b.container.IMPULSE_STATE_ERROR;
        IMPULSE_STATE_QUEUED = b.container.IMPULSE_STATE_QUEUED;
    };

    suite.test('.put/get', async (putGetTest) => {
        beforeEach();
        const impulse = ducks.impulse('put', {id: 1, name: 'Donald'});
        await impulse.send();

        putGetTest.equals(ducksMap.size, 1, 'has ONE duck');
        const values = Array.from(impulse.response.values());
        putGetTest.equals(values[0].name, 'Donald', 'is donald');
        putGetTest.end();
    });

    suite.end();
});
