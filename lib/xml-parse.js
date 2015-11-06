var xamel = require('xamel');

module.exports = function(xmlSource, opts) {
    var parse = new Promise(function(resolve, reject) {
        xamel.parse(xmlSource, opts, function(err, xml) {
            if (err) return reject(err);
            resolve(xml);
        });
    });

    return parse;
};
