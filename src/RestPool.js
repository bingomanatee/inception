import {Store} from '@wonderlandlabs/looking-glass-engine';
import lGet from 'lodash.get';
import axios from 'axios';
import urlJoin from 'url-join';

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
                return impulse.updateFrom(otherImpulse);
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
                impulse.respond(null, response);
            } catch (err) {
                impulse.response(err);
            }
            impulse.pool.updateFrom(response);
            impulse.respond(null, response);
            impulse.sync({
                filter,
                map
            });
        }));

        channels.set('getAll', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query} = requestOptions;
            let response;
            try {
                const options = {headers, query};
                response = await fetcher.get(impulse.pool.url(''), options);
                response = impulse.pool.toDataMap(response, impulse);
                impulse.respond(null, response);
            } catch (err) {
                impulse.response(err);
            }
            impulse.pool.updateFrom(response);
            impulse.respond(null, response);
            impulse.sync({
                filter,
                map
            });
        }));

        channels.set('delete', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, id} = requestOptions;
            let response;
            try {
                const options = {headers, query};
                response = await fetcher.get(impulse.pool.url(id), options);
                impulse.respond(null, response);
                impulse.complete();
            } catch (err) {
                impulse.response(err);
            }
        }));

        channels.set('put', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, id, fields} = requestOptions;
            let response;
            try {
                const options = {headers, query};
                response = await fetcher.put(impulse.pool.url(id), fields, options);
                response = impulse.pool.toDataMap(response, impulse);
                impulse.respond(null, response);
            } catch (err) {
                impulse.response(err);
            }
            impulse.pool.updateFrom(response);
            impulse.respond(null, response);
            impulse.sync({
                filter,
                map
            });
        }));

        channels.set('post', d(async ({fetcher, impulse, requestOptions, filter, map}) => {
            const {headers, query, fields} = requestOptions;
            let response;
            try {
                const options = {headers, query};
                response = await fetcher.post(impulse.pool.url(''), fields, options);
                response = impulse.pool.toDataMap(response, impulse);
                impulse.respond(null, response);
            } catch (err) {
                impulse.response(err);
            }
            impulse.pool.updateFrom(response);
            impulse.respond(null, response);
            impulse.sync({
                filter,
                map
            });
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
                switch (method) {
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

    bottle.factory('RestPool', ({Pool, noop, error, restFetcher, REST_ACTIONS, UNSET, restChannels, DataMap}) => {

        function isIterable(obj) {
            // checks for null and undefined
            if (obj == null) {
                return false;
            }
            return typeof obj[Symbol.iterator] === 'function';
        }

        class RestPool extends Pool {
            constructor(params) {
                const {
                    rootURL,
                    idField = 'id',
                    fetcher = restFetcher,
                    actions = REST_ACTIONS,
                    toDataMap = UNSET,
                    refreshTime = false,
                    track = true,
                    ...config
                } = params;

                super(config);
                this.fetcher = fetcher;
                this.rootURL = rootURL;
                this.idField = idField;
                this.track = track;
                this.data = track ? new DataMap([], this) : false;
                this.refreshTime = refreshTime;
                if (toDataMap !== UNSET) {
                    this.toDataMap = toDataMap;
                }

                actions.forEach((action) => {
                    if (!restChannels.has(action)) {
                        throw error(action + ' is not in restChannels', params);
                    }
                    if (!this.can(action)) {
                        this.addChannel(action, restChannels.get(action));
                    }
                });
            }

            toDataMap(response, map) {
                if (response.pool !== this) {
                    throw error('attempt to process responses from another pool', response);
                }

                if (!map) {
                    map = new DataMap([], this);
                }

                if (Array.isArray(response) || isIterable(response)) {
                    response.forEach((data) => {
                        if (data && (typeof data === 'object') && this.idField in data) {
                            map.set(data[this.idField], data);
                        }
                    });
                }

                if (response && (typeof response === 'object') && this.idField in response) {
                    map.set(response[this.idField], response);
                }

                return map;
            }

            url(id) {
                if (!id) {
                    return this.rootURL;
                }
                return urlJoin(this.rootURL, id);
            }

            updateData(map) {
                if (!this.track) {
                    return false;
                }
                if (map.pool !== this) {
                    throw error('attempt to update data from other map', {map, pool: this})
                }
                this.data.updateFrom(map, true);
            }
        }

        return RestPool;
    })
}
