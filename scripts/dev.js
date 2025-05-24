require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/../node_modules/electron`)
});
require('../dist/main.js');
