import {Store} from '@wonderlandlabs/looking-glass-engine';
import lGet from 'lodash.get';
import axios from 'axios';
import urlJoin from 'url-join';

export default (bottle) => {

    bottle.factory('RestPool', ({Pool, noop, error, restFetcher, REST_ACTIONS, UNSET, restChannels, DataMap}) => {

        function isIterable(obj) {
            // checks for null and undefined
            if (obj == null) {
                return false;
            }
            return typeof obj[Symbol.iterator] === 'function';
        }

        class RestPool extends Pool {
            constructor(name, params) {
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

                super(name, config);
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
                this._params = params;
            }


            get rootURL() {
                return this._rootURL;
            }

            set rootURL(value) {
                if (!(value && typeof value === 'string')) {
                    throw error('bad rootURL: ', {value})
                }
                this._rootURL = value;
            }

            toDataMap(response, impulse) {
                const map = new DataMap([], this);

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

                try {
                    return urlJoin(this.rootURL, `${id}`);
                } catch (err) {
                    throw error(err.message, {id, root: this.rootURL})
                }
            }

            updateData(map) {
                if (!this.track) {
                    return false;
                }
                if (!(map instanceof DataMap)) {
                    throw error('updateData: attempt to update from non DataMap', {
                        map,
                        pool: this
                    })
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
