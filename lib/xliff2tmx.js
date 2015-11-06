var xamel = require('xamel'),
    escape = require('escape-html'),
    pkg = require('../package'),
    creationdate = new Date().toISOString(),
    srcLang = 'RU-RU',
    // trgtLang = 'EN-US',
    adminlang;

var tmxBegin = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<tmx version="1.4">',
    '    <header',
    '        creationtool="' + pkg.name + '"',
    '        creationtoolversion="' + pkg.version + '"',
    '        segtype="sentence"',
    '        adminlang="' + (adminlang || srcLang) + '"',
    '        srcLang="' + srcLang + '"',
    '        creationdate="' + creationdate + '"',
    '    >',
    '    </header>',
    '    <body>'
];

var tmxEnd = [
    '    </body>',
    '</tmx>'
];

module.exports = function(xliff, cb) {
    xamel.parse(xliff, { buildPath: 'xliff/file/body/trans-unit', trim: false }, function(err, units) {
        if (err) return cb(err);

        var tmx = [];

        units.forEach(function(unit) {
            var source = unit.find('source'),
                target = unit.find('target');

            tmx.push([
                '        <tu creationdate="20110510T103323Z">',
                '            <tuv xml:lang="' + source.eq(0).attr('xml:lang') + '">',
                '                <seg>' + escape(source.text(true).join('')) + '</seg>',
                '            </tuv>',
                '            <tuv xml:lang="' + target.eq(0).attr('xml:lang') + '">',
                '                <seg>' + escape(target.text(true).join('')) + '</seg>',
                '            </tuv>',
                '        </tu>'
            ].join('\n'))
        });

        cb(null, tmxBegin.concat(tmx, tmxEnd).join('\n'));
    });
};
