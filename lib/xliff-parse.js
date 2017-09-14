const xmlParse = require('./xml-parse');

module.exports = function(xliff) {
    return xmlParse(xliff, {buildPath: 'xliff/file/body/trans-unit', trim: false})
        .then(units => {
            // units.forEach(function (unit) {
            //     var id = unit.attr('id'),
            //         text = unit.find(tag).text(true).join('');

            //     skeleton = skeleton.replace('%%%' + id + '%%%', text);
            // });

            // cb && cb(null, skeleton);

            // return skeleton;

            return // TBD;
        });
};
