import lGet from 'lodash.get';
import axios from 'axios';
import {filter, map, startWith} from 'rxjs/operators';

export default (bottle) => {
    bottle.constant('REST_ACTIONS', 'get,put,post,delete,getAll'.split(','));

    bottle.factory('axios', () => axios);

    bottle.factory('restFetcher', ({axios}) => {
        return {
            get: async (url, options) => {
                return await axios.get(url, options);
            },
            put: async (url, fields, options) => {
                return await axios.put(url, fields, options);
            },
            post: async (url, fields, options) => {
                return await axios.post(url, fields, options);
            },
            delete: async (url, options) => {
                return await axios.delete(url, options);
            },
            getAll: async (url, options) => {
                return await axios.get(url, options);
            },
        }
    });

    bottle.factory('observeSingle', ({restDataFromImpulse, isUnset, UNSET, DataMap}) => {

        const observeSingle = (impulse, identity = UNSET) => {
            if (isUnset(identity)) {
                identity = restDataFromImpulse(impulse, true);
            }
            const sub = impulse.pool.updates.pipe(
                filter(otherImpulse => {
                    let show = false;
                    if (otherImpulse.impulseId === impulse.impulseId) {
                        show = false;
                    } else if (otherImpulse.response instanceof DataMap && otherImpulse.response.has(identity)) {
                        show = true;
                    } else if (otherImpulse.channel.name === 'delete') {
                        let otherId = restDataFromImpulse(otherImpulse, true);
                        show = otherId === identity;
                    }
                    return show;
                }),
                map((otherImpulse) => {
                    let result = false;
                    if (otherImpulse.channel.name === 'delete') {
                        result = new DataMap([], impulse.pool);
                    } else if (otherImpulse.response instanceof DataMap) {
                        result = impulse.response.clone().updateFrom(otherImpulse.response);
                    }
                    return result;
                })
            ).subscribe(dm => {
                if (dm !== false) {
                    impulse.update({result: dm});
                }
                if (dm === null) {
                    sub.unsubscribe();
                }
            }, (err) => console.log('--------  error observing', impulse.toJSON(), err));
            impulse.addSubscriber(sub);
        };

        return observeSingle;
    });

    bottle.factory('restChannels', ({UNSET, observeSingle, error, restDataFromImpulse, DataMap, isUnset}) => {
            const channels = new Map();

            channels.set('get', {
                action: async (impulse) => {
                    const {headers, query, identity} = restDataFromImpulse(impulse);
                    const {fetcher} = impulse.pool;

                    const options = {headers, query};
                    const {data} = await fetcher.get(impulse.pool.url(identity), options);
                    let dataMap = impulse.pool.toDataMap(data, impulse);
                    impulse.pool.data.updateFrom(dataMap, true);
                    return dataMap;
                },
                observer(impulse) {
                    return observeSingle(impulse);
                }
            });

            channels.set('getAll', {
                action: async (impulse) => {
                    const {headers, query} = restDataFromImpulse(impulse);
                    const {fetcher} = impulse.pool;

                    const options = {headers, query};
                    const {data} = await fetcher.get(impulse.pool.url(''), options);

                    let dataMap = impulse.pool.toDataMap(data, impulse);
                    impulse.pool.dataMap = dataMap.clone();
                    return dataMap;
                },
                observer(impulse) {
                    observeSingle(impulse);
                }
            });

            channels.set('delete', {
                action: async (impulse) => {
                    const {headers, query, identity} = restDataFromImpulse(impulse);
                    const {fetcher} = impulse.pool;

                    const options = {headers, query};
                    await fetcher.delete(impulse.pool.url(identity), options);

                    impulse.pool.data.delete(identity);
                    return new DataMap([], impulse.pool);
                },
                observer() {
                    // why would you want to observe delete?
                }
            });


            channels.set('put', {
                action: async (impulse) => {
                    const {headers, query, identity, fields} = restDataFromImpulse(impulse);
                    const {fetcher} = impulse.pool;

                    const options = {headers, query};
                    const {data} = await fetcher.put(impulse.pool.url(identity), fields, options);
                    let dataMap = impulse.pool.toDataMap(data, impulse);
                    impulse.pool.data.updateFrom(dataMap, true);
                    return dataMap;
                },
                observer(impulse) {
                    return observeSingle(impulse);
                }
            });

            channels.set('post', {
                action: async (impulse) => {
                    const {headers, query, fields} = restDataFromImpulse(impulse);
                    const {fetcher} = impulse.pool;

                    const options = {headers, query};
                    const {data} = await fetcher.post(impulse.pool.url(''), fields, options);
                    let dataMap = impulse.pool.toDataMap(data, impulse);
                    impulse.pool.data.updateFrom(dataMap, true);
                    return dataMap;
                },
                observer(impulse) {
                    let identity;
                    return impulse.then((result) => {
                        if (result instanceof DataMap) {
                            identity = Array.from(result.keys()).pop();
                            return observeSingle(impulse, identity);
                        }
                    });
                }
            });

            return channels;
        }
    );

    bottle.factory('restDataFromImpulse', ({UNSET}) => {
        return function restDataFromImpulse(impulse, idOnly) {
            const {pool, message} = impulse;
            let {idField, refreshTime} = pool;
            let identity = UNSET;
            let fields = {};
            let headers = {};
            let query = {};
            let config = false;
            if (Array.isArray(message)) {
                let list = [...message];
                switch (impulse.channel.name) {
                    case 'get':
                        list = message.shift();
                        break;
                    case 'put':
                        identity = list.shift();
                        fields = list.shift();
                        break;
                    case 'post':
                        fields = list.shift();
                        break;

                    default:
                        identity = lGet(fields, idField, UNSET);
                        if (!idOnly) {
                            fields = list.shift();
                        }
                }
                if (message.length) {
                    config = list.shift();
                }
            } else if (typeof message === 'object') {
                switch (impulse.channel.name) {
                    case 'get':
                        identity = lGet(message, idField, UNSET);
                        config = message;
                        break;

                    case 'post':
                        fields = message;
                        break;

                    case 'put':
                        identity = lGet(message, idField, UNSET);
                        if (message.fields) {
                            fields = message.fields;
                            config = message;
                        } else {
                            fields = message;
                        }
                        break;

                    default:
                        identity = lGet(message, idField, UNSET);
                        fields = message;
                }
            } else {
                identity = message;
            }

            if (idOnly) {
                return identity;
            }

            if (config && (typeof config === 'object')) {
                headers = lGet(config, 'headers', {});
                query = lGet(config, 'query', {});
                refreshTime = lGet(config, 'refreshTime', refreshTime);
            }

            return {
                identity,
                headers,
                idField,
                fields,
                query,
                refreshTime
            }
        }
    });
}
;
