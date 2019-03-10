import {Store} from '@wonderlandlabs/looking-glass-engine';

export default (bottle) => {

  bottle.factory('Collection', ({}) => {
    return class Collection extends Store {
      constructor(name, {fetcher}) {
        super({
          state: new Map(),
          actions: {
            getOne: (collection, id) => {
              return this.fetcher.get(id)
                .then(data => {
                  this.state.set(data.identity, data)
                });
            }
          }
        });
        this.name = name;
        this.fetcher = fetcher;
        fetcher.collection = this;
      }
    };
  });
}
