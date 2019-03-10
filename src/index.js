import bottle from './bottle';

const myBottle = bottle();
const {
  Collection,
  Data,
  Fetcher
} = myBottle.container;

export {
  Collection,
  Data,
  Fetcher,
  bottle
}

export default {
  Collection,
  Data,
  Fetcher,
  bottle
}
