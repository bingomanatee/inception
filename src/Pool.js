import {Store} from '@wonderlandlabs/looking-glass-engine';
import {Subject} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import lGet from 'lodash.get';

export default (bottle) => {

    bottle.factory('poolRunner', ({PoolRunner}) => {
        return new PoolRunner;
    });

    bottle.factory('PoolRunner', ({}) => {
        /**
         * PoolRunner schedules the flushing of all pools.
         * By default all pools share the same runner;
         * if you need to coordinate the flushing of pools,
         * you can grant a set of pools their own runner.
         *
         * By default the runner will flush as often as possible
         * based on requestAnimationFrame. If you want to manage or throttle
         * the scheduling, you can call setManual() on the runner,
         * and then you are responsible for scheduling the flushing yourself.
         */
        class PoolRunner {
            constructor() {
                this.isManual = false;
                this.errors = new Subject();
            }

            /**
             *
             * @returns {Set<Pool>}
             */
            get pendingPools() {
                if (!this._pendingPools) {
                    this._pendingPools = new Set();
                }
                return this._pendingPools;
            }

            add(pool) {
                this.pendingPools.add(pool);
                if (!(this.isManual)) {
                    this.prepFlush();
                }
            }

            prepFlush() {
                if (!this.willFlush) {
                    this.willFlush = setTimeout(() => this.flush());
                }
            }

            flush() {
                this.pendingPools.forEach(pool => {
                    try {
                        pool.flush();
                    } catch (error) {
                        this.errors.next(({error, pool}))
                    }
                });
                this.pendingPools.clear();
                this.willFlush = false;
            }

            setManual(value) {
                if (value === false) {
                    this.isManual = false;
                } else {
                    this.isManual = true;
                }
            }
        }

        return PoolRunner;
    });

    bottle.factory('Pool', function ({Impulse, Channel, poolRunner}) {
        return class Pool {
            constructor(name, channels = {}, params = {}) {
                this.name = name;
                this.channels = channels;
                this.responses = new Subject();
                this.params = params;
                this.pending = new Set();
                this.runner = lGet(params, 'runner', poolRunner)
            }

            get channels() {
                if (!this._channels) {
                    this._channels = new Map();
                }
                return this._channels;
            }

            can(name) {
                return this.channels.has(name);
            }

            set channels(value) {
                if (!value) {
                    this._channels = new Map();
                } else if (value instanceof Map) {
                    this._channels = value;
                } else if (typeof value === 'object') {
                    this._channels = new Map();
                    Object.keys(value).forEach((key) => {
                        this.channels.set(key, value[key]);
                    })
                }

                Array.from(this.channels.keys())
                    .forEach((name) => {
                        const channel = this.channels.get(name);
                        if (!(channel instanceof Channel)) {
                            if (typeof channel === 'function') {
                                this.channels.set(name, new Channel({
                                    pool: this,
                                    name,
                                    response: channel
                                }));
                            } else if (typeof channel === "object") {
                                this.channels.set(name, new Channel({
                                    ...channel,
                                    name,
                                    pool: this
                                }))
                            }
                        }
                    });
            };

            addChannel(name, resolver = false, params = {}, force = false) {
                if (!force && this.channels.has(name)) {
                    throw error('duplicate channel', {
                        pool: this,
                        name
                    });
                }
                let p = new Channel({name, pool: this, resolver, params});
                this.channels.set(name, p);
                return
            }

            impulse(name, ...options) {
                if (!this.can(name)) {
                    throw error('pool missing channel:', {
                        name,
                        pool: this,
                        options
                    });
                }
                return this.channels.get(name).impulse(...options);
            }

            get config() {
                if (!this._config) {
                    this._config = {}
                }
                return this._config;
            }

            set config(value) {
                if (value) {
                    if (typeof value !== 'object') {
                        throw error('bad config', {config: value});
                    }
                }
                this._config = value;
            }

            submit(impulse) {
                if (impulse instanceof Impulse) {
                    this.pending.add(impulse);
                    this.schedulePending();
                }
            }

            flush() {
                this.pending.forEach(impulse => {
                    impulse.perform();
                })
                this.pending.clear();
            }

            schedulePending() {
                this.runner.add(this);
            }
        };
    });
}
