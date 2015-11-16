var xamel = require('xamel'),
    xmlParse = require('./xml-parse');

module.exports = function(xliffSource, tmxSource, opts, cb) {
    var srcLang = opts.srcLang || 'ru-RU',
        trgtLang = opts.trgtLang || 'en-US';

    Promise.all([
        xmlParse(xliffSource, { trim: false }),
        xmlParse(tmxSource, { trim: false })
    ]).then(function(data) {
        var xliff = data[0],
            tmx = data[1],
            xliffUnits = xliff.find('xliff/file/body/trans-unit'),
            tmxUnits = tmx.find('tmx/body/tu');

        xliffUnits.forEach(function(unit) {
            var unitSource = unit.find('source'),
                sourceText = unitSource.text(true).join(''),
                targetNode = unit.children[3];

            for (var i = 0; i < tmxUnits.length; i++) {
                var tmxUnit = tmxUnits.eq(i),
                    tuv = tmxUnit.find('tuv'),
                    tmxUnitSource = tuv.isAttr('xml:lang', srcLang).eq(0).find('seg'),
                    tmxSourceText = tmxUnitSource.text(true).join('');

                // TODO: add fuzzy translations

                // are equal without inline markup
                if (sourceText === tmxSourceText) {
                    var trgtSeg = tuv.isAttr('xml:lang', trgtLang).eq(0).find('seg');

                    // are equal with inline markup
                    if (JSON.stringify(unitSource.explode()) === JSON.stringify(tmxUnitSource.explode())) {
                        targetNode.parent.attrs.approved = 'yes';
                        targetNode.attrs.state = 'translated';
                    }

                    targetNode.children = trgtSeg.explode().children;
                    return;
                }
            }
        });

        cb(null, xamel.serialize(xliff));
    }).catch(cb);
};
