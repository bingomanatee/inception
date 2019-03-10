export default (bottle) => {
  bottle.constant('SIGNAL_STATUS_NEW', Symbol('NEW'));
  bottle.constant('SIGNAL_STATUS_SENT', Symbol('SENT'));
  bottle.constant('SIGNAL_STATUS_DONE', Symbol('DONE'));
  bottle.factory('Signal', ({Record, UNSET}) => {

    class Signal {
      constructor({collection, action, record, records}) {
        this.collection = collection;
        this.action = action;
        this.status = 'new';
        if (record) this.record = record;
        if (records) this.records = records;

        const executor = (done, fail) => {
          this._done = done;
          this._fail = fail;
        };
        this._resolved = false;

        this.promise = new Promise(executor);
      }

      send() {
        this.collection.send(this);
      }

      get resolved() {
        return this._resolved;
      }

      /**
       * _resolve (optionally) sets the final value of the change
       * and closes the promise. It can only execute once.
       *
       * If value is (or is set to) a value then the change
       * resolves that value and takes the result as the change's value
       * then returns it.
       *
       * @param value {variant} optional
       * @returns {Promise}
       */
      resolve(response = UNSET) {
        if (this.resolved) {
          return this.promise;
        }

        if (response !== UNSET) {
          this.response = response;
        }

        this._resolved = true;
        this._done(this);
        return this.promise;
      }

      reject(response = UNSET) {
        if (this.resolved) {
          return this.promise;
        }

        this._resolved = true;

        if (response !== UNSET) {
          this.response = response;
        }

        this._fail(this);
        return this.promise;
      }

      then(...args) {
        return this.promise.then(...args);
      }

      catch(listener) {
        return this.promise.catch(listener);
      }
    }
  });
}
