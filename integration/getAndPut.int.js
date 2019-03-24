const tap = require('tap');
import beforeEach from './beforeEach';
import {inspect} from 'util';

tap.test('Pool', (suite) => {

    suite.test('post/get', async (postGetTest) => {
        const {userPool} = await beforeEach();

        // initial post
        const impulse = userPool.impulse('post', {
            email: 'fred@foo.com',
            name: 'Fred',
            password: '12345235'
        });

        await impulse.send();

        let record = impulse.response.values().next().value;

        postGetTest.equal(record.email, 'fred@foo.com');
        postGetTest.equal(record.name, 'Fred');

        // validating independent get
        let getImpulse = userPool.impulse('get', record._id);
        await getImpulse.send();

        record = getImpulse.response.values().next().value;

        postGetTest.equal(record.email, 'fred@foo.com');
        postGetTest.equal(record.name, 'Fred');

        postGetTest.end();
    });

    suite.test('observing', async (obsTest) => {
        const {userPool} = await beforeEach();

        // initial post
        const impulse = userPool.impulse('post', {
            email: 'fred@foo.com',
            name: 'Fred',
            password: '12345235'
        });
        impulse.observe();
        await impulse.send();
        const record = impulse.response.values().next().value;

        obsTest.equal(record.email, 'fred@foo.com');
        obsTest.equal(record.name, 'Fred');

        // validating independent get
        await userPool.impulse('put', record._id, {email: 'fred@foo.com', name: 'Fred Smith'})
            .send();

        const afterRecord = impulse.response.values().next().value;

        obsTest.equal(afterRecord.email, 'fred@foo.com');
        obsTest.equal(afterRecord.name, 'Fred Smith');

        obsTest.end();
    });

    suite.test('subscribing', async (subTest) => {
        const {userPool} = await beforeEach();

        // initial post
        const impulse = userPool.impulse('post', {
            email: 'fred@foo.com',
            name: 'Fred',
            password: '12345235'
        });
        impulse.observe();
        let responseStream = [];
        impulse.subscribe((data) => {
            if (!data.response) {
                responseStream.push(null);
            } else {
                responseStream.push(Array.from(data.response.values())
                    .map((record) => {
                        let out = {...record};
                        delete out.createdAt;
                        delete out.updatedAt;
                        return out;
                    })
                )
            }
        });
        await impulse.send();
        const record = impulse.response.values().next().value;

        // validating independent get
        await userPool.impulse('put', record._id, {email: 'fred@foo.com', name: 'Fred Smith'})
            .send();
        
        subTest.same(responseStream, [
            null,
            [
                {
                    "_id": record._id,
                    "email": "fred@foo.com",
                    "name": "Fred"
                }
            ],
            [
                {
                    "_id": record._id,
                    "email": "fred@foo.com",
                    "name": "Fred Smith",
                }
            ]
        ]);

        subTest.end();
    });

    suite.end();
});
