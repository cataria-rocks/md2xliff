var xamel = require('xamel'),
    xmlParse = require('./xml-parse');

module.exports = function(tmx1Source, tmx2Source, cb) {
    Promise.all([
        xmlParse(tmx1Source, { trim: false }),
        xmlParse(tmx2Source, { trim: false })
    ]).then(function(data) {
        var tmx1 = data[0],
            tmx2 = data[1],
            tmx1Body = tmx1.find('tmx/body').eq(0),
            tmx1Units = tmx1.find('tmx/body/tu'),
            tmx2Units = tmx2.find('tmx/body/tu');

        // TODO: support different translations per one <tu>
        tmx2Units.forEach(function(tmx2Unit) {
            for (var i = 0; i < tmx1Units.length; i++) {
                // TODO: 'en-US' -> targetLang
                // TODO: check source lang as well
                // TODO: check <tu> date to decide which one to keep
                var tmx1UnitTargetLangSeg = JSON.stringify(tmx1Units.eq(i).isAttr('xml:lang', 'en-US').find('tuv/seg')),
                    tmx2UnitTargetLangSeg = JSON.stringify(tmx2Unit.isAttr('xml:lang', 'en-US').find('tuv/seg'));

                if (tmx1UnitTargetLangSeg === tmx2UnitTargetLangSeg) return;
            }

            tmx1Body.append(tmx2Unit);
        });

        cb(null, xamel.serialize(tmx1));
    }).catch(cb);
};
