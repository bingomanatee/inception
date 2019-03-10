const fs = require('fs');
const path = require('path');

const SRC_ROOT = __dirname;

fs.readdir(SRC_ROOT, (err, names) => {
  if (err) throw (err);
  names.forEach((name) => {
    if (/\.test\.js$/.test(name)){
      require(path.resolve(SRC_ROOT, name));
    }
  });
});
