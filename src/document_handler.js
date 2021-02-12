const busboy = require('busboy');
const fs = require('fs');

const logger = require('./logger');
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

class documentHandler {
    constructor(options) {
        this.store = options.store;
        this.keyGenerator = options.keyGenerator;
        this.maxLength = options.maxLength;
    }

    handleSocket(socket, data) {
        if ((socket.bytesRead == 1) || (socket.bytesRead == 2)) {
            logger.info('document without content was sent.');
            socket.destroy();
            return;
        }

        if (socket.bytesRead > this.maxLength) {
            logger.info({maxLength: this.maxLength}, 'document exceeds maximum length.');
            socket.destroy();
            return;
        }

        this.keyGenerator.create().then(key => {
            this.store.save(key, data).then(() => {
                logger.info({key: key}, 'added document.');
                socket.write(`${config.app.url}/${key}\n`);
                socket.pipe(socket);

                socket.destroy();
            }).catch(error => {
                logger.error('internal error occurred.');
                socket.destroy();
            });
        });
    }

    handlePost(request, response) {
        var _this = this;
        var buffer = '';
        var cancelled = false;

        var contentType = request.headers['content-type'];
        if (contentType && contentType.split(';')[0] == 'multipart/form-data') {
            const Busboy = new busboy({
                headers: request.headers
            });

            Busboy.on('field', (fieldname, value) => {
                if (fieldname == 'data') {
                    buffer = value;
                }
            });
            Busboy.on('finish', () => {
                onFinish();
            });

            request.pipe(Busboy);
        } else {
            request.on('data', data => {
                buffer += data.toString();
            });
            request.on('end', () => {
                if (cancelled) return;

                onFinish();
            });
            request.on('error', (error) => {
                logger.error('internal error occurred.');
                response.status(500).json({
                    message: "Internal error occurred."
                });
                cancelled = true;
            });
        }

        function onFinish() {
            if (!buffer.length) {
                logger.info('document without content was sent.');
                response.status(411).json({
                    message: "Length required."
                });
                cancelled = true;
                return;
            }

            if (_this.maxLength && buffer.length > _this.maxLength) {
                logger.info({maxLength: _this.maxLength}, 'document exceeds maximum length.');
                response.status(413).json(JSON.stringify({
                    message: "Document exceeds maximum length."
                }));
                cancelled = true;
                return;
            }

            _this.keyGenerator.create().then(key => {
                _this.store.save(key, buffer).then(() => {
                    logger.info({key: key}, 'added document.');
                    response.status(200).json({
                        key: key
                    });
                }).catch(error => {
                    logger.error('internal error occurred.');
                    response.status(500).json({
                        message: "Internal error occurred."
                    });
                });
            });
        }
    }

    handleGet(request, response) {
        const key = request.params.key.split('.')[0];
        
        if (!/^[a-zA-Z0-9]+$/.test(key)) {
            logger.info({key: key}, 'document not found.');
            response.status(404).json({
                message: "Document not found."
            });
            return;
        }

        this.store.get(key).then(data => {
            logger.info({key: key}, 'retrieved document.');
            response.status(200).json({
                key: key,
                data: data
            });
        }).catch(error => {
            logger.info({key: key}, 'document not found.');
            response.status(404).json({
                message: "Document not found."
            });
        });
    }

    handleRaw(request, response) {
        const key = request.params.key.split('.')[0];

        if (!/^[a-zA-Z0-9]+$/.test(key)) {
            logger.info({key: key}, 'document not found.');
            response.status(404).json({
                message: "Document not found."
            });
            return;
        }

        this.store.get(key).then(data => {
            logger.info({key: key}, 'retrieved document.');
            response.writeHead(200, {
                "Content-Type": "text/plain; charset=utf-8"
            });
            response.end(data);
        }).catch(() => {
            logger.info({key: key}, 'document not found.');
            response.status(404).json({
                message: "Document not found."
            });
        });
    }
}

module.exports = documentHandler;