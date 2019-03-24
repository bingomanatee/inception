import {Store} from '@wonderlandlabs/looking-glass-engine';
import {filter, map} from 'rxjs/operators';
import lget from 'lodash.get';
import uuid from 'uuid/v4';

export default (bottle) => {

    bottle.factory('Channel', ({UNSET, Update, Impulse, error, noop, isUnset}) => {
        /**
         * A channel is a named operation
         */
        return class Channel {
            constructor({name, pool, action, observer = UNSET, params = {}}) {
                this.pool = pool;
                this.name = name || uuid();
                this.action = action;
                this.params = params;
                this.observer = observer;
            }

            get action() {
                return this._resolver || noop;
            }

            set action(value) {
                if (this._resolver) {
                    throw error('cannot redefine Channel.action', {resolver: value});
                }
                if (!(typeof value === 'function')) {
                    throw error('Channel.action must be a function', {resolver: value});
                }
                this._resolver = value;
            }

            async perform(impulse) {
                let performError = null;
                let result = null;

                try {
                    result = await this.action(impulse, this.params, this);
                } catch (err) {
                    console.log(error('error performing ' + this.name, {
                        error: err,
                        impulse: impulse.toJSON()
                    }));
                    performError = err;
                }

                const update = new Update({
                    error: performError, result, impulse, channel: this
                });

                impulse.update(update);
                return impulse;
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
