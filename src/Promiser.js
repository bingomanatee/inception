
export default (bottle) => {

  bottle.factory('Promiser', () => {
    return class Promiser {
      constructor() {
        this._resolved = false;
        this.promise = new Promise((done, fail) => {
          this._done = done;
          this._fail = fail;
        });
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


  })



}
