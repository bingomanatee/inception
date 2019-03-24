import uuid from 'uuid/v4';
import {Subject} from 'rxjs';
import {inspect} from 'util';
import cloneDeep from 'lodash.clonedeep';
import {filter, map, startWith} from 'rxjs/operators';
import lGet from 'lodash.get';

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
                                   isUnset,
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
         * Once set, its response subscribes to the pools updates
         * stream so that it can change (or present warnings) when
         * the pool's other impulse updates are relevant to the response.
         */
        class Impulse extends Promiser {
            constructor({channel, pool, options: message}) {
                super();
                this.impulseId = uuid();
                this.channel = channel;
                this.message = message;
                this.pool = pool;
                this.state = IMPULSE_STATE_NEW;
                this.response = null;
                this.error = null;
            }

            get updaters() {
                if (!this._updaters) {
                    this._updaters = new Set();
                }
                return this._updaters;
            }

            addSubscriber(sub) {
                if (this.state === IMPULSE_STATE_COMPLETE) {
                    sub.complete();
                } else {
                    this.updaters.add(sub);
                }
            }

            complete() {
                if (this._updaters) {
                    this._updaters.forEach(s => s.unsubscribe());
                }
                this.state = IMPULSE_STATE_COMPLETE;
            }

            /**
             * send transmits the impulse to the pool.
             * You can send() more than once to re-poll pools.
             */
            send() {
                switch (this.state) {
                    case IMPULSE_STATE_NEW:
                        this.pool.submit(this);
                        break;

                    default:
                        throw error('cannot send impulse from state', this.toJSON());
                        break;
                }
                this.state = IMPULSE_STATE_QUEUED;
                return this;
            }

            clone() {
                return new Impulse({
                    channel: this.channel,
                    options: cloneDeep(this.message),
                    pool: this.pool
                });
            }

            update(updateMessage) {
                const {error = null, result} = updateMessage;

                if (error) {
                    this.error = error;
                    this.state = IMPULSE_STATE_ERROR;
                    this.reject(error);
                    this.pool.updates.error(updateMessage);
                } else {
                    if (!result) {
                        console.log('========== undefined result into', this.toJSON());
                    }
                    if (!this.resolved) {
                        this.resolve(result);
                        this.state = IMPULSE_STATE_RESOLVED;
                    } else {
                        this.response = result;
                        this.state = IMPULSE_STATE_UPDATED;
                    }
                }
                this.pool.next(this);
                return this;
            }

            toJSON() {
                const r = this.response instanceof DataMap ? inspect(Array.from(this.response.entries())) : this.response;
                return {
                    impulseId: this.impulseId,
                    state: this.state,
                    message: this.message,
                    channel: this.channel.name,
                    response: r,
                    error: this.error,
                    resolved: this.resolved
                }
            }

            perform() {
                switch (this.state) {
                    case IMPULSE_STATE_QUEUED:
                        this.channel.perform(this);
                        break;

                    case IMPULSE_STATE_NEW:
                        this.channel.perform(this);
                        break;

                    default:
                        throw error('Cannot perform impulse from state', this.toJSON());
                }
                return this;
            }

            get canSubscribe() {
                let can = false;
                switch (this.state) {
                    case IMPULSE_STATE_QUEUED:
                        can = true;
                        break;
                    case IMPULSE_STATE_NEW:
                        can = true;
                        break;
                }
                return can;
            }

            observe() {
                if (!this.canSubscribe) {
                    throw error('cannot subscribe', this.toJSON())
                }
                if (!isUnset(this.channel.observer)) {
                    let observer =  this.channel.observer(this);
                    if (observer) {
                        this.addSubscriber(this.pool.subscribe(observer));
                    }
                }
                return this;
            }

            subscribe(observer) {
                if (!this.canSubscribe) {
                    throw error('cannot subscribe')
                }
                let sub = this.pool
                    .updates
                    .pipe(
                        filter(impulse => lGet(impulse, 'impulseId') === this.impulseId),
                        startWith(this)
                    ).subscribe(observer);

                this.addSubscriber(sub);
                return sub;
            }
        }

        return Impulse;
    });
}
