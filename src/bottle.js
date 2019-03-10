import Bottle from 'bottlejs';

import collFactory from './Collection';
import fetcherFactory from './Fetcher';
import dataFactory from './Data';

export default () => {
  let bottle = new Bottle();
  bottle.constant('UNSET', Symbol('UNSET'));
  bottle.factory('ifUnset', ({UNSET}) => {
    return (value, defaultValue) => {
      if ((value === UNSET) || (typeof value === "undefined")) {
        return defaultValue;
      }
      else {
        return value;
      }
    }
  });

  collFactory(bottle);
  fetcherFactory(bottle);
  dataFactory(bottle);

  return bottle;
}
