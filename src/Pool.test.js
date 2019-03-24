const tap = require('tap');
const {inspect} = require('util');
const {Subject} = require('rxjs');
const lGet = require('lodash.get');
const cloneDeep = require('lodash.clonedeep');
import {filter, map} from 'rxjs/operators';

import {bottle} from './../lib';

tap.test('Pool', (suite) => {

    const beforeEach = () => {
        const b = bottle();
        let Pool;
        let Channel;
        let value;
        let poolRunner;
        let IMPULSE_STATE_NEW;
        let IMPULSE_STATE_SENT;
        let IMPULSE_STATE_QUEUED;
        let IMPULSE_STATE_RESOLVED;
        let IMPULSE_STATE_ERROR;
        let noop;
        let UNSET;

        let valuePool;
        let addChannelAction;
        let addFollowChannel;
        let subChannelAction;

        IMPULSE_STATE_NEW = b.container.IMPULSE_STATE_NEW;
        IMPULSE_STATE_SENT = b.container.IMPULSE_STATE_SENT;
        IMPULSE_STATE_RESOLVED = b.container.IMPULSE_STATE_RESOLVED;
        IMPULSE_STATE_ERROR = b.container.IMPULSE_STATE_ERROR;
        IMPULSE_STATE_QUEUED = b.container.IMPULSE_STATE_QUEUED;
        UNSET = b.container.UNSET;
        noop = b.container.noop;
        Pool = b.container.Pool;

        poolRunner = b.container.poolRunner;
        Channel = b.container.Channel;
        value = {value: 0};
        valuePool = new Pool('value');

        addChannelAction = (impulse) => {
            const num = lGet(impulse, 'message');
            value.value += num;
            return value.value;
        };

        subChannelAction = (impulse) => {
            const num = lGet(impulse, 'message');
            value.value -= num;
            return value.value;
        };

        return {
            Pool,
            Channel,
            value,
            poolRunner,
            IMPULSE_STATE_NEW,
            IMPULSE_STATE_SENT,
            IMPULSE_STATE_QUEUED,
            IMPULSE_STATE_RESOLVED,
            IMPULSE_STATE_ERROR,
            noop,
            valuePool,
            addChannelAction,
            subChannelAction,
            UNSET
        }
    };

    suite.test('.channels, .addChannel', (testChannels) => {

        testChannels.test('empty', (testChannelsEmpty) => {
            const {valuePool} = beforeEach();

            testChannelsEmpty.equals(valuePool.channels.size, 0);
            testChannelsEmpty.ok(!valuePool.can('add'));
            testChannelsEmpty.end();
        });

        testChannels.test('with a channel', (testWithChannel) => {
            const {valuePool, addChannelAction} = beforeEach();
            valuePool.addChannel('add', addChannelAction);

            testWithChannel.equals(valuePool.channels.size, 1);
            testWithChannel.ok(valuePool.can('add'));

            testWithChannel.end();
        });

        testChannels.end();
    });

    suite.test('.impulse', (testImpulse) => {
        testImpulse.test('without sending', (testImpulseNoSend) => {
            const {valuePool, addChannelAction, IMPULSE_STATE_NEW, value,} = beforeEach();
            valuePool.addChannel('add', addChannelAction);
            const impulse = valuePool.impulse('add', 3);
            testImpulseNoSend.equal(impulse.message, 3);
            testImpulseNoSend.equals(value.value, 0);
            testImpulseNoSend.ok(impulse.state === IMPULSE_STATE_NEW, 'is new');

            testImpulseNoSend.end();
        });

        testImpulse.test('with sending', (testImpulseSend) => {
            testImpulseSend.test('makes update', (testMakeUpdate) => {
                const {valuePool, addChannelAction} = beforeEach();
                valuePool.addChannel('add', addChannelAction);
                let resultCount = 0;
                valuePool.subscribe((impulse) => {
                    ++resultCount;
                    testMakeUpdate.same(lGet(impulse, 'response'), 3);
                    testMakeUpdate.end();
                }, (err) => {
                    console.log('=========== subscribe error: ', err.message);
                });
                const impulse = valuePool.impulse('add', 3);
                impulse.send();
            });

            testImpulseSend.test('with sending -- multiple adds', async (testImpulseSend2) => {
                const {valuePool, addChannelAction, value} = beforeEach();
                valuePool.addChannel('add', addChannelAction);
                const add3 = valuePool.impulse('add', 3);
                const add6 = valuePool.impulse('add', 6);
                await add3.send();
                await add6.send();

                testImpulseSend2.equal(value.value, 9);
                testImpulseSend2.equals(add3.response, 3);
                testImpulseSend2.equals(add6.response, 9);
                testImpulseSend2.equals(value.value, 9);
                testImpulseSend2.end();
            });
            testImpulseSend.end();
        });


        testImpulse.test('subscription', (testSub) => {
            testSub.test('basic listening', async (testListen) => {
                const {valuePool, addChannelAction, value, subChannelAction, UNSET} = beforeEach();
                valuePool.addChannel('add', {
                    action: addChannelAction, observer(impulse) {
                        impulse.pool.updates
                            .pipe(filter(otherImpulse => {
                                if (!otherImpulse) {
                                    console.log('empty from pipe');
                                    return false;
                                }
                                return impulse.impulseId !== lGet(otherImpulse, 'impulseId');
                            }))
                            .subscribe((otherImpulse) => {
                                impulse.update({result: otherImpulse.response})
                            });
                    }
                });
                valuePool.addChannel('sub', {action: subChannelAction, subscriber: {}});
                const add3 = valuePool.impulse('add', 3);
                const add3messages = [];
                add3.subscribe((impulse) => add3messages.push(lGet(impulse, 'response', UNSET)));
                add3.observe();

                const add6 = valuePool.impulse('add', 6);
                const add10 = valuePool.impulse('add', 10);
                const sub4 = valuePool.impulse('sub', 4);
                await add3.send();
                await add6.send();
                await add10.send();
                await sub4.send();

                testListen.same(add3messages, [ null, 3, 9, 19, 15 ]);
                testListen.end();
            });
            testSub.end();
        });

        testImpulse.end();
    });

    suite.end();
});
