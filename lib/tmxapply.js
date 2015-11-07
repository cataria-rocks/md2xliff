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
            var sourceText = unit.find('source').text(true).join(''),
                targetNode = unit.children[3];

            var translations = tmxUnits.reduce(function(prev, cur) {
                var tuv = cur.find('tuv'),
                    tmxSourceText = tuv.isAttr('xml:lang', srcLang).eq(0)
                        .find('seg').text(true).join('');

                // TODO: add fuzzy translations
                // TODO: break loop on 100% found
                // TODO: mark as approved if equal with inline markup
                if (sourceText === tmxSourceText) {
                    var trgtSeg = tuv.isAttr('xml:lang', trgtLang).eq(0).find('seg');
                    prev.push(trgtSeg.explode());
                }
                return prev;
            }, []);

            if (translations[0]) {
                targetNode.parent.attrs.approved = 'yes';
                targetNode.attrs.state = 'translated';
                targetNode.children = translations[0].children;
            }
        });

        cb(null, xamel.serialize(xliffUnits));
    }).catch(cb);
};
