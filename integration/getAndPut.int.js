const tap = require('tap');
const {inspect} = require('util');
const {Subject} = require('rxjs');
const lGet = require('lodash.get');
const cloneDeep = require('lodash.clonedeep');

import {bottle} from './../lib';

tap.test('Pool', (suite) => {
    let RestPool;
    let userPool;

    const beforeEach = (channels) => {
        const b = bottle();
        RestPool = b.container.RestPool;
        const DataMap = b.container.DataMap;

        userPool = new RestPool('user', {
            rootURL: 'http://localhost:9000/user',
            idField: '_id',
            toDataMap(response, impulse) {
                const result = new DataMap([], impulse.pool);
                switch (impulse.channel.name) {
                    case 'post':
                        result.set(response[impulse.pool.idField], response);
                        break;
                    case 'get':
                        result.set(response[impulse.pool.idField], response);
                        break;
                    case 'put':
                        result.set(response[impulse.pool.idField], response);
                        break;
                    case 'getAll':
                        response.docs.forEach((doc) => {
                            result.set(doc[impulse.pool.idField], doc);
                        });
                        break;
                }

                console.log('-------');
                console.log('returning ', Array.from(result.values()));
                console.log('from response', response);
                console.log('-------');
                return result;
            }
        });
    };

    suite.test('post/get', async (postGetTest) => {
        beforeEach();

        const allImpulse = userPool.impulse('getAll', {});
        await allImpulse.send();
        allImpulse.complete();

        let keys = Array.from(allImpulse.response.keys());
        while (keys.length) {
            let key = keys.pop();
            await userPool.impulse('delete', key).send();
        }

        const impulse = userPool.impulse('post', {
            email: 'fred@foo.com',
            name: 'Fred',

            password: '12345235'
        });





        
        await impulse.send();

        let record = impulse.response.values().next().value;

        postGetTest.equal(record.email, 'fred@foo.com');
        postGetTest.equal(record.name, 'Fred');

        console.log('record ---', record);
        let getImpulse = userPool.impulse('get', record._id);
        console.log('----- second fetch: ', getImpulse.toJSON());
        try {
            await getImpulse.send();
        } catch (err) {
            console.log('getImpulse error:', err);
        }

        console.log('get impulse:', impulse.toJSON());

    /*    record = getImpulse.response.values().next().value;

        console.log('got record ---', record);

        postGetTest.equal(record.email, 'fred@foo.com');
        postGetTest.equal(record.name, 'Fred');*/

        postGetTest.end();
    });

    suite.end();
});
