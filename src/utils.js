export default function unsetFactory(bottle) {
    bottle.factory('UNSET', ({Symbol}) => Symbol('UNSET'));
    bottle.factory('ifUnset', ({UNSET}) => {
        return (value, defaultValue) => {
            if ((value === UNSET) || (typeof value === "undefined")) {
                return defaultValue;
            } else {
                return value;
            }
        }
    });

    bottle.factory('isUnset', ({UNSET}) => {
        return (item) => item === UNSET;
    });

    bottle.factory('Symbol', ({noop}) => {
        return (string) => ({name: string});
    });

    bottle.factory('error', () => (msg, info) => {
        let e = new Error(msg);
        if (info) {
            return Object.assign(e, {info})
        }
        return e;
    });
}
