import lGet from 'lodash.get';
import axios from 'axios';

export default (bottle) => {
    bottle.constant('REST_ACTIONS', 'get,put,post,delete,getAll'.split(','));

    bottle.factory('axios', () => axios);

    bottle.factory('restFetcher', ({axios}) => {
        return {
            get: async (url, options) => {
                const {data} = await axios.get(url, options);
                return data;
            },
            put: async (url, fields, options) => {
                const {data} = await axios.get(url, fields, options);
                return data;
            },
            post: async (url, fields, options) => {
                try {
                    const result = await axios.post(url, fields, options);
                    return result.data;
                } catch (err) {
                    throw err.response;
                }
            },
            delete: async (url, options) => {
                try {
                    const result = await axios.delete(url, options);
                    return result.data;
                } catch (err) {
                    throw err.response;
                }
            },
            getAll: async (url, options) => {
                try {
                    const result = await axios.get(url, options);
                    return result.data;
                } catch (err) {
                    throw err.response;
                }
            },
        }
    });

    bottle.factory('restChannels', ({UNSET, error, restDataFromImpulse, DataMap, restFetcher, impulseID}) => {
        const channels = new Map();

        const d = (fn) => (impulse) => {
            const {pool} = impulse;
            const filter = (update) => {

            };

            return fn({fetcher, impulse, requestOptions: restDataFromImpulse(impulse), filter, map});
        };

        channels.set('get', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, id} = requestOptions;
            let response;
            try {
                const options = {headers, query};
                response = await fetcher.get(impulse.pool.url(id), options);
                response = impulse.pool.toDataMap(response, impulse);
            } catch (err) {
                impulse.respond(err);
                return;
            }
            impulse.pool.updateData(response);
            if (response) {
                impulse.respond(null, response);
            } else {
                console.log('no response', impulse, response);
            }
            if (impulse.pool.track) {
                impulse.sync({
                    filter,
                    map
                });
            }
        }));

        channels.set('getAll', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query} = requestOptions;
            let response;

            const options = {headers, query};
            response = await fetcher.get(impulse.pool.url(''), options);
            response = impulse.pool.toDataMap(response, impulse);
            impulse.pool.updateData(response);
            if (impulse.pool.track) {
                impulse.sync({
                    filter,
                    map
                });
            }
            return response;
        }));

        channels.set('delete', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, id} = requestOptions;
            let response;
            const options = {headers, query};
            response = await fetcher.delete(impulse.pool.url(id), options);
            return response;
        }));

        channels.set('put', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, id, fields} = requestOptions;
            let response;
            const options = {headers, query};
            response = await fetcher.put(impulse.pool.url(id), fields, options);
            response = impulse.pool.toDataMap(response, impulse);

            impulse.pool.updateData(response);
            if (impulse.pool.track) {
                impulse.sync({
                    filter,
                    map
                });
            }
            return response;
        }));

        channels.set('post', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, fields} = requestOptions;
            let response;

            const options = {headers, query};
            response = await fetcher.post(impulse.pool.url(''), fields, options);
            response = impulse.pool.toDataMap(response, impulse);

            impulse.pool.updateData(response);
            impulse.sync({
                filter,
                map
            });
            return response;
        }));

        return channels;
    });

    bottle.factory('restDataFromImpulse', ({UNSET}) => {
        return function restDataFromImpulse(impulse, idOnly) {
            const {pool, options} = impulse;
            let {idField, refreshTime} = pool;
            let id = UNSET;
            let fields = {};
            let headers = {};
            let query = {};
            let config = false;

            if (Array.isArray(options)) {
                switch (impulse.channel) {
                    case 'get':
                        id = options.shift();
                        break;
                    case 'put':
                        fields = options.shift();
                        break;

                    default:
                        id = lGet(fields, idField, UNSET);
                        if (!idOnly) {
                            fields = options.shift;
                        }
                }
                if (options.length) {
                    config = options.shift();
                }
            } else if (typeof options === 'object') {
                switch (impulse.channel) {
                    case 'get':
                        id = lGet(options, idField, UNSET);
                        config = options;
                        break;

                    case 'post':
                        fields = options;
                        break;

                    case 'put':
                        id = lGet(options, idField, UNSET);
                        if (!idOnly) {
                            if (options.fields) {
                                fields = options.fields;
                                config = options;
                            } else {
                                fields = options;
                            }
                        }
                        break;

                    default:
                        id = lGet(options, idField, UNSET);
                        fields = options;
                }
            } else {
                id = options;
            }

            if (!idOnly && config && (typeof config === 'object')) {
                headers = lGet(config, 'headers', {});
                query = lGet(config, 'query', {});
                refreshTime = lGet(config, 'refreshTime', refreshTime);
            }

            if (idOnly) {
                return id;
            }

            return {
                id,
                headers,
                idField,
                fields,
                query,
                refreshTime
            }
        }
    });
};
