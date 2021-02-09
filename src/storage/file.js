const fs = require('fs');
const path = require('path');

const logger = require('../logger');

class FileStorage {
    constructor(options) {
        this.basePath = options.path;
    }

    save(key, data) {
        if (!fs.existsSync(this.basePath)) {
            logger.info({path: this.basePath}, 'creating storage directory.');
            fs.promises.mkdir(this.basePath, { mode: 700 }).catch(error => {
                logger.fatal('failed to create storage directory.');
            });
        }
        
        return new Promise((resolve, reject) => {
            fs.promises.writeFile(path.join(this.basePath, key), data, { mode: 700 }).then(() => {
                resolve(true);
            }).catch(error => {
                reject(error);
            });
        }); 
    }

    get(key) {
        return new Promise((resolve, reject) => {
            fs.promises.readFile(path.join(this.basePath, key), 'utf8').then(data => {
                resolve(data);
            }).catch(error => {
                reject(false);
            });
        });
    }
}

module.exports = FileStorage;