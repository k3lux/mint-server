const bunyan = require('bunyan');
const logger = bunyan.createLogger({
    name: 'mint-server',
    streams: [
        {
            stream: process.stdout
        },
        {
            path: './mint-server.log'
        }
    ]
});

module.exports = logger;