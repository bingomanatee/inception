import {Store} from '@wonderlandlabs/looking-glass-engine';
import {Subject} from 'rxjs';
import {filter, map} from 'rxjs/operators';
import lget from 'lodash.get';

export default (bottle) => {

  bottle.factory('Collection', ({Signal, UNSET, ifUnset, noop, CollectionData}) => {
    return class Collection {
      constructor(name, config) {
        this.name = name;
        this.idName = lget(config, 'idName', 'id');

        this.data = new Store({
          state: {data: this._dataToMap(lget(config, 'data', []))},
          actions: {
            set(store, props) {
              let record = new CollectionData(props, this);
              let data = this.store.state.data;
              data.set(record.id, record);
              return {...this.store.state, data};
            }
          },
        });

        this.stream = new Subject();

        this.data.subscribe((store) => {
          this.stream.next(store.state);
        });
      }

      _dataToMap(data = []) {
        let map = new Map();
        data.forEach(fields => {
          let cd = new CollectionData(fields, this);
          let id = cd.id;
          map.set(id, cd);
        });

        return map;
      }

      signal(action) {
        return new Signal({
          action,
          filter: this._filterFor(action),
          map: this._mapFor(action),
          collection: this
        });
      }

      _filterFor(action) {
        let filter = noop;
        let e = null;
        switch (lget(action, 'do', UNSET)) {
          case UNSET:
            let e = new Error('signal without do');
            e.signal = signal;
            break;

          case 'get':
            const id = lget(action, 'where.id', UNSET);
            if (id === UNSET) {
              e = new Error('get signal without id');
              e.signal = signal;
              throw e;
            }
            else {
              filter = (message) => {
                if (message.error) {
                  return false;
                }
                let data = lget(message, 'data', new Map());
                return data.has(id);
              };
            }
            break;

          default:
            e = new Error('signal without do');
            e.signal = signal;
        }
        if (e) {
          throw e;
        }
        return filter;
      }

      _mapFor(action) {
        let map = noop;
        let e;
        switch (lget(action, 'do', UNSET)) {
          case UNSET:
            let e = new Error('signal without do');
            e.signal = signal;
            break;

          case 'get':
            const id = lget(action, 'where.id', UNSET);
            if (id === UNSET) {
              e = new Error('get signal without id');
              e.signal = signal;
            }
            else {
              map = (message) => {
                let data = lget(message, 'state.data', new Map());
                if (!data.has(id)) {
                  throw new Error('record not found')
                }
                return {data: [data.get(id)]}
              };
            }
            break;

          default:
            e = new Error('signal without do');
            e.signal = signal;
        }

        if (e) {
          throw e;
        }
        return map;
      }

      get(id) {
        return this.signal({
          do: 'get',
          where: {id}
        });
      }

      perform(signal) {
        const signalDo = lget(signal, 'action.do', UNSET);
        switch (signalDo) {
          case 'get':
            this.stream.next({
              state: this.data.state,
              signalId: signal.signalId
            });
            break;

          default:
            this.stream.next({
              error: new Error('unknown action ' + signalDo)
            });
        }
      }
    };
  });
}
