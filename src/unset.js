export default function unsetFactory(bottle) {
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
}
