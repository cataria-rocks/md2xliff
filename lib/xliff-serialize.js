var EOL = require('os').EOL;

module.exports = function(xliffData) {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">',
        '  <file ' + (xliffData.markdownFileName ? 'original="' + xliffData.markdownFileName + '"' : ''),
        '    source-language="' + (xliffData.srcLang || 'ru') + '" target-language="' + (xliffData.trgLang || 'en') + '" datatype="markdown">',
        '    <header>'
        ].concat(
    xliffData.skeletonFilename ? [
        '      <skl>',
        '        <external-file href="' + xliffData.skeletonFilename + '"/>',
        '      </skl>'
    ] : [],
    [
        '    </header>',
        '    <body>'
    ], xliffData.units.map(function(unit) {
        return [
            '<trans-unit id="' + unit.id + '">',
            '  <source xml:lang="' + unit.source.lang + '">' + (unit.source.content || '') + '</source>',
            '  <target xml:lang="' + unit.target.lang + '">' + (unit.target.content || '') + '</target>',
            '</trans-unit>'
        ].join(EOL);
    }), [
        '    </body>',
        ' </file>',
        '</xliff>'
    ]).join(EOL);
};
