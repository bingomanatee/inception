export default (bottle) => {

  bottle.constant('DATA_STATUS_START', Symbol('DATA_STATUS_START'));
  bottle.constant('DATA_STATUS_LOADED', Symbol('DATA_STATUS_LOADED'));
  bottle.constant('DATA_STATUS_LOADING', Symbol('DATA_STATUS_LOADING'));
  bottle.constant('DATA_STATUS_DELETED', Symbol('DATA_STATUS_DELETED'));

  bottle.factory('Data', ({UNSET, DATA_STATUS_START}) => {
    return class Data {
      constructor(props, fetcher, status = DATA_STATUS_START) {
        if (props.fields){
          const {fetcher: pFetcher, fields = {}, status: pStatus} = props;
          this.fields = fields;
          this.status = pStatus;
          this.fetcher = pFetcher;
        }

        else {
          this.fields = props;
          this.fetcher = fetcher;
          this.status = status;
        }
      }

      get id() {
        return this.fields[this.fetcher.id];
      }
    };
  });
}
