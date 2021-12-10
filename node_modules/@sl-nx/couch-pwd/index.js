var crypto = require('crypto');

class CouchPwd {
  constructor(iterations = 10, keylen = 20, size = 16, encoding = 'hex', digest = 'SHA1') {
    this.iterations = iterations;
    this.keylen = keylen;
    this.size = size;
    this.encoding = encoding;
    this.digest = digest;
  }

  /**
   * If `pwd` and `salt` are provided:
   *  - creates a hash from both
   *  - returns `hash`
   * If just `pwd` is provided:
   *  - generates `salt` and hashes
   *  - returns `salt` and `hash`
   */
  hash(pwd, salt, cb = undefined) {
    if (arguments.length === 3) {
      // hash('secret', 'salt', function(err, hash) {})
      if (!pwd) return cb(new Error('password missing'));
      if (!salt) return cb(new Error('salt missing'));

      crypto.pbkdf2(pwd, salt, this.iterations, this.keylen, this.digest, (err, hash) => {
        if (err) return cb(err);

        cb(null, hash.toString(this.encoding));
      });
    } else {
      // hash('secret', function(err, salt, hash) {})
      cb = salt;
      if (!pwd) return cb(new Error('password missing'));

      crypto.randomBytes(this.size, (err, salt) => {
        if (err) return cb(err);

        const saltStr = salt.toString('hex');
        crypto.pbkdf2(pwd, saltStr, this.iterations, this.keylen, this.digest, (err, hash) => {
          if (err) return cb(err);

          cb(null, saltStr, hash.toString(this.encoding));
        });
      });
    }
  }
}
module.exports = CouchPwd;
