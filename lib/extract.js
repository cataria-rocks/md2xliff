var escape = require('escape-html'),
    marked = require('marked'),
    extractComments = require('esprima-extract-comments');

marked.InlineLexer = require('./InlineLexer');

function extract(markdownStr, markdownFileName, skeletonFilename, srcLang, trgLang, options) {
    var skeleton = markdownStr,
        tokens = marked.lexer(markdownStr, options),
        xliffUnits = [],
        segmentCounter = 0;

    markdownFileName || (markdownFileName = 'source.md');
    skeletonFilename || (skeletonFilename = markdownFileName.split('.').shift() + '.skl.md');
    srcLang || (srcLang = 'ru-RU');
    trgLang || (trgLang = 'en-US');

    function addUnit(text) {
        segmentCounter++;
        skeleton = skeleton.replace(text, '%%%' + segmentCounter + '%%%');

        xliffUnits.push([
            '<trans-unit id="' + segmentCounter + '">',
            '  <source xml:lang="' + srcLang + '">' + escape(text) + '</source>',
            '  <target xml:lang="' + trgLang + '"></target>',
            '</trans-unit>'
        ].join('\n'));
    }

    function onCode(code, lang) {
        if (lang !== 'js') return addUnit(code);

        try {
            extractComments.fromString('(' + code + ')').forEach(function(comment) {
                addUnit(comment.value);
            });
        } catch(err) {
            console.log('Esprima was not able to parse comments. Code was saved as is.', err, code);
            addUnit(code);
        }
    }

    function onHTML(text) {
        // TODO: handle HTML properly
        addUnit(text);
    }

    function onTable(table) {
        table.header.forEach(addUnit);
        table.cells.forEach(function(row) {
            row.forEach(addUnit);
        });
    }

    // TODO: onText is almost the same as addUnit
    function onText(text) {
        segmentCounter++;
        skeleton = skeleton.replace(text, '%%%' + segmentCounter + '%%%');

        var inlineTokens = marked.inlineLexer(text, tokens.links, options),
            serializedText = inlineTokens.map(onInlineToken).join('');

        xliffUnits.push([
            '<trans-unit id="' + segmentCounter + '">',
            '  <source xml:lang="' + srcLang + '">' + serializedText + '</source>',
            '  <target xml:lang="' + trgLang + '"></target>',
            '</trans-unit>'
        ].join('\n'));
    }

    function onInlineToken(token, idx) {
        var type = token.type;

        idx++; // is used to generate `id` starting with 1

        if (type === 'text') return token.text;

        if (['strong', 'em', 'del', 'code', 'autolink', 'nolink'].indexOf(type) > -1) {
            // TODO: support ctype for bpt
            return '<bpt id="' + idx + '">' + token.markup[0] + '</bpt>' +
                    escape(token.text) +
                '<ept id="' + idx + '">' + token.markup[1] + '</ept>';
        }

        if (type === 'link' || type === 'reflink') {
            var insideLinkTokens = marked.inlineLexer(token.text, tokens.links, options),
                serializedText = insideLinkTokens.map(onInlineToken).join('');

            // image
            if (token.markup[0] === '!') return [
                '<bpt id="' + idx + '">' + token.markup[0] + token.markup[1] + '</bpt>',
                    serializedText,
                '<ept id="' + idx + '">' + token.markup[2] + '</ept>',
                '<bpt id="' + ++idx + '">' + token.markup[3] + '</bpt>',
                    token.href,
                '<ept id="' + idx + '">' + token.markup[4] + '</ept>'
            ].join('');

            return '<bpt id="' + idx + '00">' + token.markup[0] + '</bpt>' +
                    serializedText +
                (token.markup.length === 3 ?
                    ('<ept id="' + idx + '00">' + token.markup[1][0] + '</ept>' +
                    '<bpt id="' + ++idx + '00">' + token.markup[1][1] + '</bpt>' +
                        token.href +
                    '<ept id="' + idx + '00">' + token.markup[2] + '</ept>') :
                    '<ept id="' + idx + '00">' + token.markup[1] + '</ept>');
        }

        if (type === 'tag') {
            // TODO: <img src="https://img-fotki.yandex.ru/get/3607/246231603.0/0_14ae54_3b59c928_orig.png" alt="RIF Voronezh" style="float:right;padding:0 0 20px 20px;width:200px;height:auto;">
            return '<ph id="' + idx +'">' + escape(token.text) + '</ph>';
        }

        if (type === 'br') return '<ph id="' + idx +'">' + token.markup + '</ph>';

        // TODO: support other token types
        return token.text;
    }

    tokens.forEach(function(token) {
        var type = token.type,
            text = token.text;

        if (type === 'table') return onTable(token);
        if (typeof text === 'undefined') return;

        if (type === 'code') return onCode(text, token.lang);
        if (type === 'html') return onHTML(text);

        // Split into segments by `; `, `. `, `! ` and `? `
        text.split(/[;|\.|!|\?]\s/).forEach(onText);
    });

    // handle reflinks like
    // [ym]: https://github.com/ymaps/modules
    var reflinks = tokens.links;
    Object.keys(reflinks).forEach(function(linkKey) {
        var link = reflinks[linkKey];
        // TODO: translate link keys ?
        // TODO: check if such approach may replace other occurrence of a string
        addUnit(link.href);
        link.title && addUnit(link.title);
    });

    var xliff = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">',
        '  <file original="' + markdownFileName + '"',
        '    source-language="' + srcLang + '" target-language="' + trgLang + '" datatype="markdown">',
        '    <header>',
        '      <skl>',
        '        <external-file href="' + skeletonFilename + '"/>',
        '      </skl>',
        '    </header>',
        '    <body>'
    ].concat(xliffUnits, [
        '    </body>',
        ' </file>',
        '</xliff>'
    ]).join('\n');

    return {
        skeleton: skeleton,
        xliff: xliff
    };
}

module.exports = extract;
