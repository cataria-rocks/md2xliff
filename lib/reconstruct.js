const tag = process.env.USE_SOURCE ? 'source' : 'target';

module.exports = function(xliffData, skeleton) {
    xliffData.units.forEach(function (unit) {
        skeleton = skeleton.replace('%%%' + unit.id + '%%%', unit[tag].content);
    });

    return skeleton;
};
