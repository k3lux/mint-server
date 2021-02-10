const express = require('express');
const st = require('st');

const fs = require('fs');
const path = require('path');
const net = require('net');

const app = express();

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const logger = require('./logger');

const store = new (require(`./storage/${config.storage.type}`))(config.storage);
const keyGenerator = new (require(`./generators/${config.keyGenerator.type}`))(config.keyGenerator);
const documentHandler = new (require('./document_handler.js'))({
    store: store,
    keyGenerator: keyGenerator,
    maxLength: config.maxLength
});

for (const name in config.documents) {
    const documentPath = path.join(__dirname, 'documents', config.documents[name]);
    fs.promises.readFile(documentPath, 'utf8').then(data => {
        store.save(name, data).then(() => {
            logger.info({document: name, path: documentPath}, 'loaded static document.');
        });
    }).catch(error => {
        logger.fatal({document: name, path: documentPath}, 'failed to load document.');
        process.exit();
    });
}

app.post('/documents', (request, response) => {
    return documentHandler.handlePost(request, response);
});

app.get('/raw/:id', (request, response) => {
    return documentHandler.handleRaw(request, response);
});

app.get('/documents/:id', (request, response) => {
    return documentHandler.handleGet(request, response);
});

app.use(st({
	path: path.join(__dirname, 'static', config.app.theme),
	passthrough: true,
	index: false
}));

app.get('/:id', (request, response, next) => {
    request.sturl = '/';
    next();
});

app.use(st({
    content: { 
        maxAge: config.staticMaxAge 
    },
	path: path.join(__dirname, 'static', config.app.theme),
	index: 'index.html'
}));

app.listen(config.http.port, () => {
    logger.info({port: config.http.port}, 'http listening.');
});

if (config.server.enabled) {
    const server = net.createServer(socket => {
        var i = 0;

        logger.info({address: socket.remoteAddress, port: socket.remotePort}, 'incoming connection.');

        socket.setEncoding('utf8');

        socket.setTimeout(config.server.timeout, function() {
            logger.info({address: socket.remoteAddress, port: socket.remotePort}, 'connection timeout.');
            socket.destroy();
        });

        socket.on('data', (data) => {
            i++;
            if (i == 1) {
                return documentHandler.handleSocket(socket, data);
            }
        });

        socket.on('close', (data) => {
            logger.info({address: socket.remoteAddress, port: socket.remotePort}, 'connection closed.');
        });
    });

    server.maxConnections = config.server.maxConnections;

    server.listen(config.server.port, () => {
        logger.info({port: config.server.port}, 'server listening.');
    });
}