export default (bottle) => {
  bottle.factory('CollectionData', ({}) => {
    return class CollectionData {
      constructor(props, collection) {
        if (props.fields){
          const {collection: pCollection, fields = {}} = props;
          this.fields = fields;
          this.collection = pCollection;
        }

        else {
          this.fields = props;
          this.collection = collection;
        }
      }

      get id() {
        return this.fields[this.collection.idName];
      }

      toJSON() {
        return {
          fields: this.fields,
          collection: this.collection.name
        }
      }
    };
  });
}
