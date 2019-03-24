# Ripple

Ripple is a stream-based REST api. It allows for rest actions to endpoints that 
can be sent and received from pools of information (endpoints). It uses RxJS under the hood
to track activity and strem and observe activity

## Pools and RestPools

`Pools` are generic models with no specific store/access model. 

`RestPools` extend the Pools interface and provide channels for the rest 
actions -- get, put, post, delete and getAll (which calls the rest endpoint index).

You can define other channels for the rest pool if your API has other endpoints/actions,
or override these endpoints if you have other parameters (headers, queries etc.)

### Watching RestPools

Every response from every channel of a Pool can be observed by calling `.subsrcribe(listener, errorListener)`
on the Pool. The pools' stream is in the .results property so other RxJS actions can be put 
over its stream. 

Also, the pool.data property is a map, synchronized with any data that comes back
from responses (including deletion); its completeness is dependant on which methdos you call. 

### Configuration

the second property to the Pool object is the configuration. 
for base Pool objects configuration has no meaning, other than that it 
can have channels that pre-seeds the pools' channels. 

RestPools have specific configurations:

* rootUrl {String} -- MANDATORY: a fully qualified URL. ('http://www.mysite.com/');
* idField {String} (optional) -- default 'id', the field used to store the primary key.
* fetcher {Object} (optional) -- an object with get, put, post, getAll methods. 
                                 by default it is a pass-through to axios. 
                                 You can replace it with your own fetcher to, for instance,
                                 mock a dataSource in tests.
* toDataMap {function} (optional) -- an opportunity to override the method that 
                                     takes the response from a rest call
                                     and transforms it into a DataMap (Map).
                                     If your rest API responses are not simple
                                     objects or arrays of objects, you can use this 
                                     method to better digest rest responses.
* methods {[String]} (optional) -- The names of the REST methods that your
                                   endpoint has. If your rest endpoint doesn't support
                                   a complete set of methods (get, post, put, delete, getAll),
                                   you can specify a subset of these strings as an array.                                                          

## Channels

Pools have one or more `Channels`, which are actions that return `Impulses`. 

### Writing your own channels

If you are writing a channel that you don't plan on observing you can add a channel with a simple function
that returns a value. It can be async:

````javascript
const {RestPool, axios} = import '@wonderlandlabs/ripple';

const users = new RestPool('users', {
        rootURL: 'http://mysite.com/users',
        idField: 'userId'
    });

users.addChannel('signOut', async (impulse) => {
    await axios.post(impulse.pool.url('reset-password', ...impulse.message));
    // http://mysite.com/users/100/reset-password
    return axios.get(impulse.pool.url(impulse.message[0])); 
    // http://mysite.com/users/100
});

const updatedUser = await users.impulse('reset-password', 100, 'abc123');

````

If you want to enable observation, you must pass an object with two properties, `action` and `observer`. 

````javascript

const {RestPool, axios, observeSingle } = import '@wonderlandlabs/ripple';

const users = new RestPool('users', {
        rootURL: 'http://mysite.com/users',
        idField: 'userId'
    });

users.addChannel('signOut', {
    action: async (impulse) => {
            await axios.post(impulse.pool.url('reset-password', ...impulse.message)); 
            // http://mysite.com/users/100/reset-password
            return axios.get(impulse.pool.url(impulse.message[0])); 
            // http://mysite.com/users/100
        },
    observer: (impulse) => {
        observeSingle(impulse, impulse.message[0])
    }  
});

````

## Impulses 

`Impulses` are pending actions -- promises.  
 
 * Impulses which execute when their `.send()` method is called.
 * Impulses are promises that return a Map of the records returned by the action, 
   so they can be used in async/await patterns.
 * If there is an error in transmission, they can be listened to via `.catch()`
   or await inside try/catch. 
 * Impulses' response property also has the records in it
   after the impulse has been executed.

### Observation

calling the `observe()` method of an impulse allows for the creation of requests
that can subscribe to the base provider and update each others' stream from the result
of other requests. `.observe()` must be called before `.send()` is resolved 
(ideally before send is called).

```javascript

const ducks = new RestPool('ducks', {
        rootURL: 'http://myDucks.com/ducks',
        idField: '_id'
    });

const impulse = ducks.impulse('post', {name: 'Donald'});
impulse.observe();
const dataMap = await impulse.send();
// dataMap is a Map with the response of the post.

const originalValues = Array.from(impulse.response.values());
assert.equals(originalValues[0].name, 'Ronald', 'name gets updated to Ronald');
await ducks.impulse('put', {id: 1, name: 'Ronald'}).send();

// note -- here we are examining the response of the FIRST post
// that is updated 
const values = Array.from(impulse.response.values());
assert.equals(values[0].name, 'Ronald', 'name gets updated to Ronald');

```

this will **NOT** guarantee your collections are up to date with the remote 
collection, but **WILL* share results based on data retrieved by other impulses.

### Subscription

Once an Impulse has been `.observe()`, you can `.subscribe(next, err, complete)` 
to the Impulse and receive a stream of updates to that records' contents based on 
the responses from other rest actions. note the first value in the stream will always be null. 

```javascript

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
        responseStream.push(Array.from(data.response.values()))
    }
});
await impulse.send();
// getting the id of the post
const record = impulse.response.values().next().value;
// validating independent get
await userPool.impulse('put', record._id, {email: 'fred@foo.com', name: 'Fred Smith'})
    .send();

console.log('results:', inspect(responseStream));

/**
[ 
    null,
    [
        { _id: '5c97de8644c4875b2ee98651',
        email: 'fred@foo.com',
        name: 'Fred',
        createdAt: '2019-03-24T19:46:14.346Z' }
    ],
    [
        { _id: '5c97de8644c4875b2ee98651',
        email: 'fred@foo.com',
        name: 'Fred Smith',
        createdAt: '2019-03-24T19:46:14.346Z',
        updatedAt: '2019-03-24T19:46:14.353Z' }
    ] 
]
  */

```

All subscriptions can be completed by calling `.complete()` on an Impulse. This will 
end all observation of the 
