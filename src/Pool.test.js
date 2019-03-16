const tap = require('tap');
const {inspect} = require('util');
const {Subject} = require('rxjs');
const lGet = require('lodash.get');
const cloneDeep = require('lodash.clonedeep');

import {bottle} from './../lib';

tap.test('Pool', (suite) => {
    let Pool;
    let Channel;
    let ducks;
    let ducksMap;
    let poolRunner;
    let nextId;
    let duckResolve;
    let IMPULSE_STATE_NEW;
    let IMPULSE_STATE_SENT;
    let IMPULSE_STATE_RESOLVED;
    let IMPULSE_STATE_ERROR;

    const beforeEach = (channels) => {
        const b = bottle();
        Pool = b.container.Pool;
        poolRunner = b.container.poolRunner;
        Channel = b.container.Channel;
        ducks = new Pool('ducks', channels);
        ducksMap = new Map();
        nextId = 0;
        duckResolve = i => {
            let duck = {
                ...i.options,
                id: lGet(i, 'options.id', ++nextId),
            }

            ducksMap.set(duck.id, duck);
            return Promise.resolve(duck);
        }

        IMPULSE_STATE_NEW = b.container.IMPULSE_STATE_NEW;
        IMPULSE_STATE_SENT = b.container.IMPULSE_STATE_SENT;
        IMPULSE_STATE_RESOLVED = b.container.IMPULSE_STATE_RESOLVED;
        IMPULSE_STATE_ERROR = b.container.IMPULSE_STATE_ERROR;
    };

    suite.test('.channels, .addChannel', (testChannels) => {

        testChannels.test('empty', (testChannelsEmpty) => {
            beforeEach();

            testChannelsEmpty.equals(ducks.channels.size, 0);
            testChannelsEmpty.end();
        });

        testChannels.test('with a channel', (testWithChannel) => {
            beforeEach();
            ducks.addChannel('put', duckResolve);

            testWithChannel.equals(ducks.channels.size, 1);
            testWithChannel.ok(ducks.can('put'));

            testWithChannel.end();
        })

        testChannels.end();
    });

    suite.test('.impulse', (testImpulse) => {
        testImpulse.test('without sending', (testImpulseNoSend) => {
            beforeEach();
            ducks.addChannel('put', duckResolve);
            let impulse = ducks.impulse('put', {name: 'Donald'});

            testImpulseNoSend.same(impulse.options, {name: 'Donald'});
            testImpulseNoSend.equals(ducksMap.size, 0);
            testImpulseNoSend.ok(impulse.state === IMPULSE_STATE_NEW);

            testImpulseNoSend.end();
        });

        testImpulse.test('with sending', (testImpulseSend) => {
            beforeEach();
            ducks.addChannel('put', duckResolve);
            let impulse = ducks.impulse('put', {name: 'Donald'});
            const sub = impulse.subscribe(
                (i) => {
                    testImpulseSend.ok(impulse.state === IMPULSE_STATE_RESOLVED, 'state is resolved');
                    testImpulseSend.equals(ducksMap.size, 1);
                    const id = Array.from(ducksMap.keys())[0];
                    testImpulseSend.equals(ducksMap.get(id).name, 'Donald');

                    sub.unsubscribe();
                    testImpulseSend.end();
                });
            impulse.send();
            testImpulseSend.ok(impulse.state === IMPULSE_STATE_SENT);
        });

        testImpulse.test('.sync', (testImpulseSend) => {
            beforeEach();
            ducks.addChannel('put', duckResolve);
            let impulse = ducks.impulse('put', {name: 'Donald'});
            const sub = impulse.subscribe(
                (i) => {
                    console.log('reviseDuck for impulse', inspect(i, {depth: 0}));
                    console.log('keys:', Array.from(ducksMap.keys()));
                    const id = Array.from(ducksMap.keys())[0];
                    testImpulseSend.equals(ducksMap.get(id).name, 'Donald');
                    let reviseDuck = ducks.impulse('put', {name: 'Ronald', id}).send();
                    ducks.impulse('put', {name: 'Daffy'}).send();
                    sub.unsubscribe();
                },
                (err) => {
                    console.log('error', err);
                });
            impulse.sync({
                filter: (forImpulse => (otherImpulse) => {
                    const id = lGet(forImpulse, 'response.id');
                    const channelName = lGet(otherImpulse, 'channel.name');
                    console.log('filtering for ', id, channelName);
                    switch (channelName) {
                        case 'put':
                            console.log('other impulse: ', otherImpulse);
                            const newId = lGet(otherImpulse, 'response.id');
                            console.log('comparing duck ids: ', id, newId);
                            return newId === id;
                            break;

                        default:
                            return false;
                    }
                }),
                map: () => (i) => {
                    return lGet(i, 'response');
                },
                merge: () => (r) => r,
                onResponse: (i, duck) => {
                    console.log('new response', duck);
                    if (duck.name === 'Ronald') {
                        testImpulseSend.end();
                    }
                }
            })
            impulse.send();
            testImpulseSend.ok(impulse.state === IMPULSE_STATE_SENT);
        });

        testImpulse.end();
    });

    suite.end();
});
