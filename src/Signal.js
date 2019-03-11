import {Subject} from 'rxjs';
import {filter, map} from "rxjs/operators";
import uuid from 'uuid/v1';

export default (bottle) => {
  bottle.constant('SIGNAL_STATUS_NEW', Symbol('NEW'));
  bottle.constant('SIGNAL_STATUS_SENT', Symbol('SENT'));
  bottle.constant('SIGNAL_STATUS_DONE', Symbol('DONE'));
  bottle.factory('Signal', ({UNSET, ifUnset, noop, Promiser, rxCatch}) => {
    return class Signal extends Promiser {
      constructor({action, collection, filter = UNSET, map = noop}) {
        super();
        this.signalId = uuid();
        this.action = action;
        this.collection = collection;
        this.stream = new Subject();
        this.filter = ifUnset(filter, () => true);
        this.map = map;

        this.subscribeToCollection();
      }

      subscribe(...args) {
        return this.stream.subscribe(...args);
      }

      subscribeToCollection() {
        const sub = rxCatch(this.collection.stream
            .pipe(
              filter((message) => {
                if (message.signalId === this.signalId) {
                  return true;
                }
                return this.filter(message);
              })
            ),
          (...args) => {
            return {...this.map(...args), signalId: this.signalId};
          }
          ,
          (error) => {
            return {error, signalId: this.signalId};
          })
          .subscribe((data) => {
              this.stream.next(data);
            },
            // error
            error => signal.stream.error(error),
            // complete
            () => sub.unsubscribe()
          );
      }

      perform() {
        this.collection.perform(this);
      }
    }
  });
}
