var strip = require('strip'),
    tag = process.env.USE_SOURCE ? 'source' : 'target';

module.exports = function(xliffData, skeleton) {
    xliffData.forEach(function (unit) {
        var id = unit.id,
            text = strip(unit[tag].content);

        skeleton = skeleton.replace('%%%' + id + '%%%', text);
    });

    return skeleton;
};
