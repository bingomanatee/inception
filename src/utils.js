export default function unsetFactory(bottle) {
    bottle.constant('UNSET', Symbol('UNSET'));
    bottle.factory('ifUnset', ({UNSET}) => {
        return (value, defaultValue) => {
            if ((value === UNSET) || (typeof value === "undefined")) {
                return defaultValue;
            } else {
                return value;
            }
        }
    });

    bottle.factory('Symbol', ({noop}) => {
        return noop;
    });

    bottle.factory('error', () => (msg, info) => {
        let e = new Error(msg)
        if (info) {
            return Object.assign(e, {info})
        }
        return e;
    });
}
