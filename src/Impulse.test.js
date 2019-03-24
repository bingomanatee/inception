const tap = require('tap');
const {inspect} = require('util');
const lGet = require('lodash.get');
const cloneDeep = require('lodash.clonedeep');
import {Subject} from 'rxjs';

import {bottle} from './../lib';

tap.test('Impulse', (suite) => {
    let Impulse;
    let value;
    let anImpulse;
    let mockPool;
    let mockChannel;
    let IMPULSE_STATE_NEW;
    let IMPULSE_STATE_SENT;
    let IMPULSE_STATE_QUEUED;
    let IMPULSE_STATE_RESOLVED;
    let IMPULSE_STATE_ERROR;
    let noop;

    let valuePool;
    let addChannelAction;

    const beforeEach = () => {
        const b = bottle();


        IMPULSE_STATE_NEW = b.container.IMPULSE_STATE_NEW;
        IMPULSE_STATE_SENT = b.container.IMPULSE_STATE_SENT;
        IMPULSE_STATE_RESOLVED = b.container.IMPULSE_STATE_RESOLVED;
        IMPULSE_STATE_ERROR = b.container.IMPULSE_STATE_ERROR;
        IMPULSE_STATE_QUEUED = b.container.IMPULSE_STATE_QUEUED;
        noop = b.container.noop;
        Impulse = b.container.Impulse;

        mockPool = {
            name: 'value',
            updates: new Subject(),
            submit(i) {
                mockPool._pending.add(i)
            },
            _pending: new Set(),
            subscribe(...args) {
                return this.updates._subscribe(...args)
            },
            next(impulse){
                mockPool.updates.next(impulse);
            }
        };

        mockChannel = {
            name: 'add'
        };

        anImpulse = new Impulse({channel: mockChannel, pool: mockPool});
    };

    suite.test('status (initial)', (initialStatus) => {
        beforeEach();

        initialStatus.equal(anImpulse.state, IMPULSE_STATE_NEW);

        initialStatus.end();
    });

    suite.test('.send', (testSend) => {
        beforeEach();

        anImpulse.send();
        testSend.equal(anImpulse.state, IMPULSE_STATE_QUEUED);
        testSend.ok(mockPool._pending.has(anImpulse));

        testSend.end();
    });

    suite.test('.update', (testUpdate) => {
        testUpdate.test('value', (testUpdateValue) => {
            beforeEach();

            anImpulse.update({result: 3})
                .then(() => {
                    testUpdateValue.equal(anImpulse.state, IMPULSE_STATE_RESOLVED);

                    testUpdateValue.end();
                });
        });

        testUpdate.end();
    });

    suite.end();
});
