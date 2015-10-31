var xamel = require('xamel'),
    tag = process.env.USE_SOURCE ? 'source' : 'target';

module.exports = function(xliff, skeleton, cb) {
    xamel.parse(xliff, { buildPath: 'xliff/file/body/trans-unit', trim: false }, function(err, units) {
        if (err) return cb(err);

        units.forEach(function(unit) {
            var id = unit.attr('id'),
                text = unit.find(tag).text(true).join('');

            skeleton = skeleton.replace('%%%' + id + '%%%', text);
        });

        cb(null, skeleton);
    });
};
