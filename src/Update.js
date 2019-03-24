const lGet = require('lodash.get');
import uuid from 'uuid/v1';

export default bottle => {

    bottle.factory('Update', ({Impulse, error, UNSET}) => {
        return class Update {
            constructor(parameters = {}) {
                this.updateId = uuid();
                let {result = UNSET, error, channel, impulse} = parameters;
                this.result = result;
                this.channel = channel;
                this.impulse = impulse;
                this.error = error;
                this.performed = false;
            }

            toJSON() {
                return {
                    updateId: this.updateId,
                    message: this.message,
                    result: this.result,
                    error: this.error,
                    channel: this.channel.name,
                    impulse: this.impulse.toJSON(),
                    performed: this.performed,
                }
            }

            perform(){
                if (this.performed) {
                    throw error('attempt to perform the same impulse more than once', this.toJSON());
                }
                this.performed = true;
               return this.impulse.perform();
            }

            get impulseId() {
                return this.impulse.impulseId;
            }

            get impulse() {
                return this._impulse;
            }

            set impulse(value) {
                if (!(value && value instanceof Impulse)) {
                    throw error('Update passed non-impulse', {
                        update: this, impulse: value
                    });
                }
                this._impulse = value;
            }

            get message() {
                return lGet(this.impulse, 'message', UNSET);
            }

            get name() {
                return lGet(this.channel, 'name', UNSET)
            }
        }
    });
}
