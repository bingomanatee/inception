import {bottle} from "../lib";

export default async () => {
    let RestPool;
    let userPool;
    const b = bottle();
    RestPool = b.container.RestPool;
    const DataMap = b.container.DataMap;

    userPool = new RestPool('user', {
        rootURL: 'http://localhost:9000/user',
        idField: '_id',
        toDataMap(response, impulse) {
            const result = new DataMap([], impulse.pool);
            switch (impulse.channel.name) {
                case 'post':
                    result.set(response[impulse.pool.idField], response);
                    break;
                case 'get':
                    result.set(response[impulse.pool.idField], response);
                    break;
                case 'put':
                    result.set(response[impulse.pool.idField], response);
                    break;
                case 'getAll':
                    response.docs.forEach((doc) => {
                        result.set(doc[impulse.pool.idField], doc);
                    });
                    break;
            }
            return result;
        }
    });
    // purging all data
    const allImpulse = userPool.impulse('getAll');
    await allImpulse.send();

    let keys = Array.from(allImpulse.response.keys());
    while (keys.length) {
        let key = keys.pop();
        await userPool.impulse('delete', key).send();
    }

    return {userPool};
};
