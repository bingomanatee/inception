import uuid from 'uuid/v1';
import {Subject} from 'rxjs';
import {inspect} from 'util';
import cloneDeep from 'lodash.clonedeep';
import {filter as rxFilter, map as rxMap} from 'rxjs/operators';

export default (bottle) => {

    bottle.factory('IMPULSE_STATE_NEW', ({Symbol}) => Symbol('IMPULSE_STATE_NEW'));
    bottle.factory('IMPULSE_STATE_QUEUED', ({Symbol}) => Symbol('IMPULSE_STATE_QUEUED'));
    bottle.factory('IMPULSE_STATE_SENT', ({Symbol}) => Symbol('IMPULSE_STATE_SENT'));
    bottle.factory('IMPULSE_STATE_RESOLVED', ({Symbol}) => Symbol('IMPULSE_STATE_RESOLVED'));
    bottle.factory('IMPULSE_STATE_UPDATED', ({Symbol}) => Symbol('IMPULSE_STATE_UPDATED'));
    bottle.factory('IMPULSE_STATE_ERROR', ({Symbol}) => Symbol('IMPULSE_STATE_ERROR'));
    bottle.factory('IMPULSE_STATE_COMPLETE', ({Symbol}) => Symbol('IMPULSE_STATE_COMPLETE'));

    bottle.factory('Impulse', ({
                                   UNSET, ifUnset, noop, Promiser, error,
                                   IMPULSE_STATE_NEW,
                                   IMPULSE_STATE_QUEUED,
                                   IMPULSE_STATE_SENT,
                                   IMPULSE_STATE_RESOLVED,
                                   IMPULSE_STATE_ERROR,
                                   IMPULSE_STATE_COMPLETE,
                                   IMPULSE_STATE_UPDATED,
                                   DataMap,
                               }) => {

        /**
         * An impulse is a single call to a channel.
         * It exists for an indefinate period before it is performed,
         * so it can be used as a "draft" or prepared query that you
         * build up and send.
         *
         * Once set, its response subscribes to the pools responses
         * stream so that it can change (or present warnings) when
         * the pool's other impulse responses are relevant to the response.
         */
        class Impulse extends Promiser {
            constructor({channel, pool, options}) {
                super();
                this.impulseId = uuid();
                this.channel = channel;
                this.options = options;
                this.pool = pool;
                this.state = IMPULSE_STATE_NEW;
                this.response = null;
                this.error = null;
            }

            subscribe(...params) {
                return this.pool.responses.pipe(
                    rxFilter((i) => {
                        return i.impulseId === this.impulseId
                    })
                ).subscribe(...params);
            }

            get updaters() {
                if (!this._updaters) {
                    this._updaters = new Set();
                }
                return this._updaters;
            }

            complete() {
                if (this._updaters) {
                    this._updaters.forEach(s => s.unsubscribe());
                    this.state = IMPULSE_STATE_COMPLETE;
                }
            }

            /**
             * send transmits the impulse to the pool.
             * You can send() more than once to re-poll pools.
             */
            send() {
                // ?? clear out old respone/error?
                switch (this.state) {
                    case IMPULSE_STATE_NEW:
                        this.pool.submit(this);
                        break;

                    default:
                        throw error('cannot send impulse from state' + this.state.toString(),
                            {impulse: this});
                        break;
                }
                this.state = IMPULSE_STATE_QUEUED;
                return this;
            }

            clone() {
                return new Impulse({
                    channel: this.channel,
                    options: cloneDeep(this.options),
                    pool: this.pool
                });
            }

            respond(respError, response) {
                if (this.status === IMPULSE_STATE_COMPLETE) {
                    return this;
                }
                if (respError) {
                    this.error = respError;
                    this.state = IMPULSE_STATE_ERROR;
                    this.reject(respError);
                    this.pool.responses.error(this);
                } else {
                    if (this.response && !response) {
                        throw error('undefined response replacing', {
                            response,
                            impulse: this.toJSON()
                        });
                    }
                    if (!this.resolved) {
                        this.resolve(response);
                        this.state = IMPULSE_STATE_RESOLVED;
                    } else {
                        this.response = response;
                        this.state = IMPULSE_STATE_UPDATED;
                    }
                    this.pool.responses.next(this);
                }
                return this;
            }

            toJSON() {
                const r = this.response instanceof DataMap ? inspect(Array.from(this.response.entries())) : this.response;
                return {
                    state: this.state,
                    options: this.options,
                    channel: this.channel.name,
                    response: r,
                    error: this.error,
                    resolved: this.resolved
                }
            }

            perform() {
                this.state = IMPULSE_STATE_SENT;
                return this.channel.perform(this);
            }

            /**
             * creates a listener updates the response property
             * of this impulse based on subsequent data from the pool.
             *
             *
             * @param filter {function(otherImpulse, impulse)} returns a boolean to use this item
             * @param map {function(otherImpulse, impulse)} transforms the otherImulse
             * @param onError {function} a stream listener
             * @param onResponse {function} a stream listener
             * @returns {Subscription}
             */
            sync({
                     filter = UNSET,
                     map = (i) => i.response,
                     onError = noop,
                     onResponse = noop,
                 }) {

                let stream = this.pool
                    .responses
                    .pipe(rxFilter(i => (i.impulseId !== this.impulseId) && (i.state !== IMPULSE_STATE_UPDATED)));
                let pipes = [rxMap((otherImpulse) => map(otherImpulse, this))];
                if (filter) {
                    pipes.unshift(rxFilter((otherImpulse) => filter(otherImpulse, this)));
                }
                stream = stream.pipe(...pipes);

                /**
                 * @response {variant} is the output from map; by default its an impulse
                 * @type {Subscription}
                 */
                const sub = stream.subscribe((response) => {
                    let lastResponse = this.response;
                    this.respond(null, response);
                    onResponse(this, response, lastResponse);
                }, onError);
                this.updaters.add(sub);
                return sub;
            }
        }

        return Impulse;
    });
}
