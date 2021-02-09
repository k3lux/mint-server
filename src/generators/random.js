class RandomGenerator {
    constructor(options) {
        this.charsSet = options.charsSet;
        this.keyLength = options.keyLength;
    }

    create() {
        return new Promise((resolve, reject) => {
            var key = '';

            for (var i = 0; i < this.keyLength; i++) {
                const index = Math.floor(Math.random() * this.charsSet.length);
                key += this.charsSet.charAt(index);
            }

            resolve(key);
        });
    }
}

module.exports = RandomGenerator;