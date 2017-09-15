const xliffParse = require('./xliff-parse');
const reconstruct = require('./reconstruct');

module.exports = function(xliff, skeleton, cb) {
    return xliffParse(xliff).then(xliffData => {
        return cb(null, reconstruct(xliffData, skeleton));
    }).catch(err => cb(err));
};
