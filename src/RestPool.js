import {Store} from '@wonderlandlabs/looking-glass-engine';
import {Subject} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import lGet from 'lodash.get';

export default (bottle) => {

    bottle.constant('REST_ACTIONS', 'get,put,post,delete'.split(','));

    bottle.factory('restChannels', ({UNSET, error, idFromImpulse, restFetcher}) => {
        const channels = new Map();

        channels.set('get', async (impulse) => {
            const {pool} = impulse;
            const fetcher = lGet(pool, 'fetcher', restFetcher);
            const requestOptions = idFromImpulse(impulse);
            const url = pool.url(requestOptions.id);
            try {
                const {headers, query} = requestOptions;
                const options = {headers, query};
                const data = await fetcher.get(url, options);
                impulse.response(null, {data});
            } catch (err) {
                impulse.response(err);
            }
        });

        channels.set('put', async (impulse) => {
            const {pool} = impulse;
            const fetcher = lGet(pool, 'fetcher', restFetcher);
            const requestOptions = idFromImpulse(impulse, 'put');
            const url = pool.url(requestOptions.id);
            try {
                const {fields, headers, query} = requestOptions;
                const options = {headers, query};
                const data = await fetcher.put(url, fields, options);
                impulse.response(null, {data});
            } catch (err) {
                impulse.response(err);
            }
        });

        return channels;
    });

    bottle.factory('idFromImpulse', ({UNSET, error}) => {

        return function idFromImpulse(impulse, method = 'get') {
            const {pool, options} = impulse;
            let {idField, refreshTime} = pool;
            let id;
            let fields = {};
            let headers = {};
            let query = {};

            if (Array.isArray(options)) {
                switch (method) {
                    case 'get':
                        id = options.shift();
                        break;

                    default:
                        fields = options.shift;
                        id = lGet(fields, idField);
                }

                if (options.length) {
                    let config = options.shift();
                    if (config && (typeof config === 'object')) {
                        if (config.headers) {
                            headers = config.headers;
                        }
                        if (config.query) {
                            query = config.query;
                        }
                        if (config.refreshTime) {
                            refreshTime = config.refreshTime;
                        }
                    }
                }
            } else if (typeof options === 'object') {
                id = lGet(options, idField, UNSET);
            } else {
                id = options;
            }

            if (id === UNSET) {
                throw error('no ' + idField + ' in options', {options})
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
    })

    bottle.factory('RestPool', ({Pool, restFetcher, REST_ACTIONS, restChannels}) => {

        class RestPool extends Pool {
            constructor({
                            rootURL,
                            idField,
                            fetcher = restFetcher,
                            actions = REST_ACTIONS,
                            refreshTime = false,
                            ...config
                        }) {
                super(config);
                this.fetcher = fetcher;
                this.rootURL = rootURL;
                this.idfield = idField;
                this.records = new Map();
                this.refreshTime = refreshTime;

                actions.forEach((action) => {
                    if (!this.can(action)) {
                        this.addChannel(action, restChannels.get(action));
                    }
                });
            }
        }

        return RestPool;
    })
}
