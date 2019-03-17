
export default bottle => {
    bottle.factory('DataMap', () => {
        return class DataMap extends Map {
            constructor(records, pool) {
                super();
                this.pool = pool;
                (Array.isArray(records) ? records : [records]).forEach(data => {
                    const id = data[pool.idField];
                    this.set(id, data);
                })
            }

            overlaps(otherDataMap) {
                if (!otherDataMap instanceof DataMap) {
                    return false;
                }
                if (otherDataMap.size < this.size) {
                    return otherDataMap.overlaps(this);
                }
                let keys = this.keys();
                let next = keys.next();
                while (!next.done) {
                    if (otherDataMap.has(next.value)) {
                        return true;
                    }
                    next = keys.next();
                }

                return false;
            }

            sharedKeys(otherDataMap) {
                if (!otherDataMap instanceof DataMap) {
                    return false;
                }
                if (otherDataMap.size < this.size) {
                    return otherDataMap.sharedKeys(this);
                }
                let keys = this.keys();
                let shared = [];
                let next = keys.next();

                while (!next.done) {
                    if (otherDataMap.has(next.value)) {
                        shared.push(next.value);
                    }
                    next = keys.next();
                }

                return shared;
            }

            /**
             * copy shared values from the other map into this one.
             * @param otherMap
             * @param useAll {bool}
             */
            updateFrom(otherMap, useAll = false) {
                if (otherMap.pool !== this.pool) {
                    throw error('attempt to merge data from wrong pool', {
                        map: this,
                        otherMap
                    })
                }

                if (useAll) {
                    otherMap.forEach((value, key) => {
                        this.set(key, value);
                    })
                } else {
                    let sharedKeys = this.sharedKeys(otherMap);
                    sharedKeys.forEach(key => {
                        this.set(key, otherMap.get(key))
                    });
                }
            }
        }
    });
}
