import lGet from 'lodash.get';
import axios from 'axios';

export default (bottle) => {
    bottle.constant('REST_ACTIONS', 'get,put,post,delete'.split(','));

    bottle.factory('axios', () => axios);

    bottle.factory('restFetcher', ({axios}) => {
        return {
            get: async (url, options) => {
                const {data} = axios.get(url, options);
                return data;
            },
            put: async (url, fields, options) => {
                const {data} = axios.get(url, fields, options);
                return data;
            }
        }
    });

    bottle.factory('restChannels', ({UNSET, error, restDataFromImpulse, DataMap, restFetcher, impulseID}) => {
        const channels = new Map();

        const d = (fn) => (impulse) => {
            const {pool} = impulse;
            const fetcher = lGet(pool, 'fetcher', restFetcher);

            const filter = (otherImpulse) => {
                return impulse.response instanceof DataMap &&
                    otherImpulse.response instanceof DataMap &&
                    impulse.response.overlaps(otherImpulse.response);
            };

            const map = (otherImpulse, impulse) => {
                impulse.response.updateFrom(otherImpulse.response);
                return impulse.response;
            };

            return fn({fetcher, impulse, requestOptions: restDataFromImpulse(impulse), filter, map});
        };

        channels.set('get', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, id} = requestOptions;
            let response;
            try {
                const options = {headers, query};
                response = await fetcher.get(impulse.pool.url(id), options);
                response = impulse.pool.toDataMap(response.data, impulse);
            } catch (err) {
                impulse.respond(err);
                return;
            }
            impulse.pool.updateData(response);
            impulse.respond(null, response);
            impulse.sync({
                filter,
                map
            });
        }));

        channels.set('getAll', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query} = requestOptions;
            let response;

            const options = {headers, query};
            response = await fetcher.get(impulse.pool.url(''), options);
            response = impulse.pool.toDataMap(response.data, impulse);

            impulse.pool.updateData(response);
            impulse.sync({
                filter,
                map
            });
            return response;
        }));

        channels.set('delete', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, id} = requestOptions;
            let response;
            const options = {headers, query};
            response = await fetcher.get(impulse.pool.url(id), options);
            return response;
        }));

        channels.set('put', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, id, fields} = requestOptions;
            let response;
            const options = {headers, query};
            response = await fetcher.put(impulse.pool.url(id), fields, options);
            response = impulse.pool.toDataMap(response.data, impulse);

            impulse.pool.updateData(response);
            impulse.sync({
                filter,
                map
            });
            return response;
        }));

        channels.set('post', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, fields} = requestOptions;
            let response;

            const options = {headers, query};
            response = await fetcher.post(impulse.pool.url(''), fields, options);
            response = impulse.pool.toDataMap(response.data, impulse);

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
                        fields = options.shift;
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
