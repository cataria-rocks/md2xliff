const xmlParse = require('./xml-parse');
const strip = require('strip');
const tag = process.env.USE_SOURCE ? 'source' : 'target';

module.exports = function(xliff, skeleton, cb) {
    return xmlParse(xliff, {buildPath: 'xliff/file/body/trans-unit', trim: false})
        .then(units => {
            units.forEach(function (unit) {
                var id = unit.attr('id'),
                    text = unit.find(tag).text(true).join('');

                skeleton = skeleton.replace('%%%' + id + '%%%', text);
            });

            cb && cb(null, skeleton);

            return skeleton;
        })
        .catch(err => cb(err));
};
