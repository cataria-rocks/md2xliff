var xamel = require('xamel'),
    strip = require('strip'),
    tag = process.env.USE_SOURCE ? 'source' : 'target';

module.exports = function(xliff, skeleton, cb) {
    if (typeof xliff !== 'string') {
        xliff.forEach(function (unit) {
            var id = unit.id,
                text = strip(unit.target.content);

            skeleton = skeleton.replace('%%%' + id + '%%%', text);
        });

        cb && cb(null, skeleton);

        return skeleton;
    }

    xamel.parse(xliff, {buildPath: 'xliff/file/body/trans-unit', trim: false}, function (err, units) {
        if (err) return cb(err);

        units.forEach(function (unit) {
            var id = unit.attr('id'),
                text = unit.find(tag).text(true).join('');

            skeleton = skeleton.replace('%%%' + id + '%%%', text);
        });

        cb && cb(null, skeleton);

        return skeleton;
    });
};
