export default (bottle) => {
  bottle.factory('Fetcher', ({Data, DATA_STATUS_LOADED, ifUnset}) => {
      return class Fetcher {
        /**
         *
         * @param name {String}
         * @param data {Map} (optional) data indexed by map;
         *             note - this is largely for the purpose of creating a "Mock Fetcher"
         *             that returns data from its internal map.
         *             A true ajax fetcher should use a remote REST source as its data.
         * @param key {String} the field that is the unique identifier.
         * @param schema {Object} a Yup schema.
         */
        constructor({
                      name,
                      data = UNSET,
                      id = 'id',
                      schema,
                    }) {

          this.name = name;
          this.id = id;
          this.schema = schema;
          this.data = data;
        }

        get data() {
          if (!this._data) {
            this._data = new Map();
          }
          return this._data;
        }

        set data(value) {
          if (!(value && value instanceof Map)) {
            if (Array.isArray(value)) {
              value = value.reduce((map, item) => {
                  if (item instanceof Data) {
                    item.fetcher = this;
                    map.set(item.id, item);
                  }
                  else if (item && (typeof item === 'object')) {
                    const dataItem = new Data(item, this, DATA_STATUS_LOADED);
                    map.set(dataItem.id, dataItem)
                  }
                  return map;
                },
                new Map())
            }
          }
          this._data = value;
        }

        set(id, data){
          this.data.set(id, data);
        }

        get(id) {
          if (this._data.has(id)) {
            return Promise.resolve(this._data.get(id));
          }
          else {
            return Promise.reject({error: 'cannot find id', id})
          }
        }

        /**
         *
         * @param fields {Object} object of field values
         * @returns Promise<Data>
         */
        put(fields) {
          return this.schema.validate(fields, this.schema)
            .then(() => {
              let data = new Data({fields, fetcher: this, status: DATA_STATUS_LOADED});
              this.set(data.id, data);
              return data;
            })
            .catch(err => {
              let error = new Error('failed to insert record');
              error.fields = fields;
              error.err = err;
              return Promise.reject(error);
            });
        }
      };
    }
  );
}
