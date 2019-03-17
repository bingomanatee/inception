import {Store} from '@wonderlandlabs/looking-glass-engine';
import {filter, map} from 'rxjs/operators';
import lget from 'lodash.get';
import uuid from 'uuid/v1';

export default (bottle) => {

    bottle.factory('Channel', ({UNSET, Impulse, error, noop}) => {
        /**
         * A channel is a named operation
         */
        return class Channel {
            constructor({name, pool, resolver, params = {}}) {
                this.pool = pool;
                this.name = name || uuid();
                this.resolver = resolver;
                this.params = params;
            }

            get resolver() {
                return this._resolver || noop;
            }

            set resolver(value) {
                if (this._resolver) {
                    throw error('cannot redefine Channel.resolver', {resolver: value});
                }
                if (!(typeof value === 'function')) {
                    throw error('Channel.resolver must be a function', {resolver: value});
                }
                this._resolver = value;
            }

            async perform(impulse) {
                let error = null;
                let response = null;
                try {
                    response = await this.resolver(impulse, this.params);
                } catch (err) {
                    error = err;
                }

                impulse.respond(error, response);
            }

            /**
             *
             * @param options
             */
            impulse(...options) {
                if (options.length === 1) {
                    options = options[0];
                }
                return new Impulse({
                    options,
                    channel: this,
                    pool: this.pool
                });
            }
        };
    });
}
