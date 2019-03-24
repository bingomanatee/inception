const tap = require('tap');
const {inspect} = require('util');
const {Subject} = require('rxjs');
const lGet = require('lodash.get');
const cloneDeep = require('lodash.clonedeep');

import {bottle} from './../lib';

tap.skip('Pool', (suite) => {
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
            },

            delete(url) {
                const id = parseInt(url.substr(ROOT_URL.length));
                ducksMap.delete(id);
                return Promise.resolve({
                    status: 200
                });
            },

            post(url, duck) {
                const id = ++nextId;

                let savedDuck = {id, ...duck};
                ducksMap.set(id, savedDuck);

                return Promise.resolve({
                    status: 200,
                    data: savedDuck
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

    suite.test('.put/get', (putGetTest) => {
        putGetTest.test('simple', async (putGetTestSimple) => {
            beforeEach();
            const impulse = ducks.impulse('put', {id: 1, name: 'Donald'});
            await impulse.send();

            putGetTestSimple.equals(ducksMap.size, 1, 'has ONE duck');
            const values = Array.from(impulse.response.values());
            putGetTestSimple.equals(values[0].name, 'Donald');
            putGetTestSimple.end();
        });

        putGetTest.test('syncing', async (putGetTestSyncing) => {
            beforeEach();
            const impulse = ducks.impulse('put', {id: 1, name: 'Donald'});
            await impulse.send();
            await ducks.impulse('put', {id: 1, name: 'Ronald'}).send();
            const values = Array.from(impulse.response.values());
            putGetTestSyncing.equals(values[0].name, 'Ronald', 'name gets updated to Ronald');
            putGetTestSyncing.end();
        });

        putGetTest.test('syncing ignores other records', async (putGSFilters) => {
            beforeEach();
            const impulse = ducks.impulse('put', {id: 1, name: 'Donald'});
            await impulse.send();
            let messages = 0;
            impulse.subscribe(() => ++messages);
            putGSFilters.equal(messages, 0);
            await ducks.impulse('put', {id: 2, name: 'Ronald'}).send();
            putGSFilters.equal(messages, 0);
            putGSFilters.end();
        });

        putGetTest.end();
    });

    suite.test('.post', (postGetTest) => {
        postGetTest.test('simple', async (postGetTestSimple) => {
            beforeEach();
            const impulse = ducks.impulse('post', {name: 'Donald'});
            await impulse.send();
            postGetTestSimple.equals(ducksMap.size, 1, 'has ONE duck');
            const values = Array.from(impulse.response.values());
            postGetTestSimple.equals(values[0].name, 'Donald');
            postGetTestSimple.equals(values[0].id, 1);
            postGetTestSimple.end();
        });

        postGetTest.test('syncing', async (postGetTestSyncing) => {
            beforeEach();
            const impulse = ducks.impulse('post', {name: 'Donald'});
            await impulse.send();
            await ducks.impulse('put', {id: 1, name: 'Ronald'}).send();
            const values = Array.from(impulse.response.values());
            postGetTestSyncing.equals(values[0].name, 'Ronald', 'name gets updated to Ronald');
            postGetTestSyncing.end();
        });

        postGetTest.test('syncing ignores other records', async (postGSFilters) => {
            beforeEach();
            const impulse = ducks.impulse('post', {id: 1, name: 'Donald'});
            await impulse.send();
            let messages = 0;
            impulse.subscribe(() => ++messages);
            postGSFilters.equal(messages, 0);
            await ducks.impulse('put', {id: 2, name: 'Ronald'}).send();
            postGSFilters.equal(messages, 0);
            postGSFilters.end();
        });

        postGetTest.end();
    });
    suite.test('.delete', (deleteGetTest) => {
        deleteGetTest.test('simple', async (deleteGetTestSimple) => {
            beforeEach();
            const impulse = ducks.impulse('put', {id: 1, name: 'Donald'});
            await impulse.send();
            await ducks.impulse('delete', 1).send();

            deleteGetTestSimple.equals(ducksMap.size, 0, 'has no ducks');
            deleteGetTestSimple.equals(impulse.response.size, 0);
            deleteGetTestSimple.end();
        });

        deleteGetTest.end();
    });

    suite.end();
});
