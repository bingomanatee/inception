import uuid from 'uuid/v1';
import {Subject} from 'rxjs';
import cloneDeep from 'lodash.clonedeep';
import {filter as rxFilter, map as rxMap} from 'rxjs/operators';

export default (bottle) => {

    bottle.factory('IMPULSE_STATE_NEW', ({Symbol}) => Symbol('IMPULSE_STATE_NEW'));

    bottle.factory('IMPULSE_STATE_SENT', ({Symbol}) => Symbol('IMPULSE_STATE_SENT'));

    bottle.factory('IMPULSE_STATE_RESOLVED', ({Symbol}) => Symbol('IMPULSE_STATE_RESOLVED'));

    bottle.factory('IMPULSE_STATE_ERROR', ({Symbol}) => Symbol('IMPULSE_STATE_ERROR'));

    bottle.factory('IMPULSE_STATE_COMPLETE', ({Symbol}) => Symbol('IMPULSE_STATE_COMPLETE'));

    bottle.factory('Impulse', ({
                                   UNSET, ifUnset, noop, Promiser, error,
                                   IMPULSE_STATE_NEW,
                                   IMPULSE_STATE_SENT,
                                   IMPULSE_STATE_RESOLVED,
                                   IMPULSE_STATE_ERROR,
                                   IMPULSE_STATE_COMPLETE
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
                        console.log(this.impulseId,
                            '=========== response filters:', i.impulseId);
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
                this.state = IMPULSE_STATE_SENT;
            }

            clone() {
                return new Impulse({
                    channel: this.channel,
                    options: cloneDeep(this.options),
                    pool: this.pool
                });
            }

            respond(error, response) {
                if (error) {
                    this.error = error;
                    this.state = IMPULSE_STATE_ERROR
                    this.reject(error);
                } else {
                    this.response = response;
                    this.state = IMPULSE_STATE_RESOLVED;
                    this.pool.responses.next(this);
                    this.resolve(response);
                }
            }

            perform() {
                return this.channel.perform(this);
            }

            /**
             * creates a listener updates the response property
             * of this impulse based on subsequent data from the pool.
             *
             *
             * @param filter {function} a *factory* function that returns a filter based on this impulse
             * @param map {function} a *factory* function that returns a
             * @param onError {function} a stream listener
             * @param onResponse {function} a stream listener
             * @param merge {function} a *factory* function that returns a merge function based on this impulse
             * @returns {Subscription}
             */
            sync({
                     filter = UNSET,
                     map = UNSET,
                     onError = noop,
                     onResponse = noop,
                     merge
                 }) {
                if (!(typeof merge === 'function')) {
                    throw error('update requires merge function', this)
                }
                const myMerge = merge(this);

                let stream = this.pool
                    .responses
                    .pipe(rxFilter(i => i.impulseId !== this.impulseId))
                let pipes = [];
                if (filter) {
                    pipes.push(rxFilter(filter(this)));
                }
                if (map) {
                    pipes.push(rxMap(map(this)));
                }
                if (pipes.length) {
                    stream = stream.pipe(...pipes);
                }

                const sub = stream.subscribe((response) => {
                    let newResponse
                    try {
                        newResponse = myMerge(response, this);
                    } catch (err) {
                        onError(err);
                        return;
                    }

                    this.respond(null, newResponse);
                    onResponse(this, newResponse, response);
                }, onError);
                this.updaters.add(sub);
                return sub;
            }
        }

        return Impulse;
    });
}
