import Bottle from 'bottlejs';

import collFactory from './Channel';
import fetcherFactory from './Pool';
import impulseFactory from './Impulse';
import catchFactory from './rxCatch';
import promiserFactory from './Promiser';
import unsetFactory from './utils';

export default () => {
  let bottle = new Bottle();
  unsetFactory(bottle);
  collFactory(bottle);
  fetcherFactory(bottle);
  catchFactory(bottle);
  impulseFactory(bottle);
  promiserFactory(bottle);

  return bottle;
}
