var xamel = require('xamel'),
    pkg = require('../package'),
    creationdate = new Date().toISOString();

module.exports = function(xliff, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }

    xamel.parse(xliff, { buildPath: 'xliff/file/body/trans-unit', trim: false }, function(err, units) {
        if (err) return cb(err);

        var srcLang, trgtLang;
        var tmxBody = units.map(function(unit) {
            var source = unit.find('source'),
                target = unit.find('target');

            srcLang || (srcLang = source.eq(0).attr('xml:lang'));
            trgtLang || (trgtLang = target.eq(0).attr('xml:lang'));

            return [
                '        <tu creationdate="' + creationdate + '">',
                '            <tuv xml:lang="' + srcLang + '">',
                '                <seg>' + xamel.serialize(source, { header: false }) + '</seg>',
                '            </tuv>',
                '            <tuv xml:lang="' + trgtLang + '">',
                '                <seg>' + xamel.serialize(target, { header: false }) + '</seg>',
                '            </tuv>',
                '        </tu>'
            ].join('\n');
        });

        var tmx = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<tmx version="1.4">',
            '    <header',
            '        creationtool="' + pkg.name + '"',
            '        creationtoolversion="' + pkg.version + '"',
            '        segtype="sentence"',
            '        adminlang="' + (opts.adminlang || srcLang) + '"',
            '        srcLang="' + srcLang + '"',
            '        creationdate="' + creationdate + '"',
            '    >',
            '    </header>',
            '    <body>'
        ].concat(tmxBody, [
            '    </body>',
            '</tmx>'
        ]).join('\n');

        cb(null, tmx);
    });
};
