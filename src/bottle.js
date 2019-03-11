import Bottle from 'bottlejs';

import collFactory from './Collection';
import fetcherFactory from './Fetcher';
import dataFactory from './Data';
import collectionDataFactory from './CollectionData';
import unsetFactory from './unset';
import catchFactory from './rxCatch';
import signalFactory from './Signal';
import promiserFactory from './Promiser';

export default () => {
  let bottle = new Bottle();
  unsetFactory(bottle);
  collFactory(bottle);
  fetcherFactory(bottle);
  dataFactory(bottle);
  collectionDataFactory(bottle);
  catchFactory(bottle);
  signalFactory(bottle);
  promiserFactory(bottle);

  return bottle;
}
