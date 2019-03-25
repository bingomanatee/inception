import bottle from './bottle';

const myBottle = bottle();
const {
    Pool,
    RestPool,
    Channel,
    Impulse,
    DataMap,
    axios
} = myBottle.container;

export {
    Pool,
    RestPool,
    Channel,
    Impulse,
    bottle,
    DataMap,
    axios
}

export default {
    Pool,
    RestPool,
    Channel,
    Impulse,
    DataMap,
    bottle,
    axios
}
