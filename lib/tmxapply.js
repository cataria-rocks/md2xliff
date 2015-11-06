var xamel = require('xamel');

module.exports = function(xliffFile, tmxFile, opts, cb) {

parseFiles(xliff, tmx, onParse);

function parseFiles(xliff, tmx, onParse) {
    xamel.parse(xliff, { trim: false }, function (err, xliff) {
        if (err) return onParse(err);

        xamel.parse(tmx, { trim: false }, function (err, tmx) {
            if (err) return onParse(err);

            onParse(null, {
                xliff: xliff,
                tmx: tmx
            });
        });
    });
}

function onParse(err, data) {
    if (err) return cb(err);

    var xliff = data.xliff,
        tmx = data.tmx,
        xliffUnits = xliff.find('xliff/file/body/trans-unit'),
        tmxUnits = tmx.find('tmx/body/tu');

    xliffUnits.forEach(function(unit) {
        var sourceText = unit.find('source').text(true).join(''),
            targetNode = unit.children[3];

        var translations = tmxUnits.reduce(function(prev, cur, idx) {
            var tuv = cur.find('tuv'),
                tmxSource = tuv.isAttr('xml:lang', 'ru-RU').eq(0).find('seg').text(true).join('');

            if (sourceText === tmxSource) {
                // prev.push(tuv.isAttr('xml:lang', 'en-US').eq(0).find('seg').text(true).join(''));
                prev.push(tuv.isAttr('xml:lang', 'en-US').eq(0).find('seg'));
            }
            return prev;
        }, []);

        var translation = translations[0];
        if (translation) {
            targetNode.children = translation.children;
        }
    });

    cb(null, xamel.serialize(xliffUnits));
}

};

var fs = require('fs'),
    path = require('path'),
    xliffFile = path.resolve(__dirname, '../test/source.xlf'),
    tmxFile = path.resolve(__dirname, '../test/source.tmx'),
    xliff = fs.readFileSync(xliffFile, 'utf8'),
    tmx = fs.readFileSync(tmxFile, 'utf8');

module.exports(xliff, tmx, {}, function(err, xliff) {
    // console.log(err, xliff);
    fs.writeFileSync('xliff-with-tmx.xlf', xliff);
});
