var escape = require('escape-html'),
    marked = require('marked'),
    htmlParser = require('./html-parser'),
    postcss = require('postcss'),
    extractComments = require('esprima-extract-comments'),
    hideErrors = process.env.HIDE_ERRORS;

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

    function addUnit(text, xml) {
        segmentCounter++;
        skeleton = skeleton.replace(text, '%%%' + segmentCounter + '%%%');

        xliffUnits.push([
            '<trans-unit id="' + segmentCounter + '">',
            '  <source xml:lang="' + srcLang + '">' + (xml || escape(text)) + '</source>',
            '  <target xml:lang="' + trgLang + '"></target>',
            '</trans-unit>'
        ].join('\n'));
    }

    function onCode(code, lang) {
        if (lang === 'css') {
            try {
                postcss.parse(code).walkComments(function(comment) {
                    addUnit(comment.text);
                });
            } catch(err) {
                hideErrors || console.log('postCSS was not able to parse comments. Code was saved as is.', err, code);
                addUnit(code);
            }

            return;
        }

        if (lang !== 'js') return addUnit(code);

        var comments;

        try {
            comments = extractComments.fromString(code);
        } catch(err) {
            try {
                comments = extractComments.fromString('(' + code + ')');
            } catch(err) {
                hideErrors || console.log('Esprima was not able to parse comments. Code was saved as is.', err, code);
                addUnit(code);
            }
        }

        comments && comments.forEach(function(comment) {
            addUnit(comment.value);
        });
    }

    function onHTML(text) {
        // TODO: handle HTML properly
        addUnit(text);
    }

    function onTable(table) {
        table.header.forEach(function(text) {
            addUnit(text);
        });
        table.cells.forEach(function(row) {
            row.forEach(function(text) {
                addUnit(text);
            });
        });
    }

    function onText(text) {
        var inlineTokens = marked.inlineLexer(text, tokens.links, options),
            xml = inlineTokens.map(onInlineToken).filter(Boolean).join('');

        xml && addUnit(text, xml);
    }

    function getTag(tag, id, content) {
        // TODO: support ctype for bpt
        return '<' + tag + ' id="' + id + '">' + content + '</' + tag + '>';
    }

    function onInlineToken(token, idx) {
        var type = token.type,
            markup = token.markup;

        idx++; // is used to generate `id` starting with 1

        if (type === 'text') return token.text;

        if (['strong', 'em', 'del', 'code', 'autolink', 'nolink'].indexOf(type) > -1) {
            return getTag('bpt', idx, markup[0]) +
                    escape(token.text) +
                getTag('ept', idx, markup[1]);
        }

        if (type === 'link' || type === 'reflink') {
            var insideLinkTokens = marked.inlineLexer(token.text, tokens.links, options),
                serializedText = insideLinkTokens.map(onInlineToken).join('');

            // image
            if (markup[0] === '!') return [
                getTag('bpt', idx, markup[0] + markup[1]),
                    serializedText,
                getTag('ept', idx, markup[2]),
                getTag('bpt', ++idx, markup[3]),
                    token.href,
                getTag('ept', idx, markup[4])
            ].join('');

            return getTag('bpt', 'l' + idx, markup[0]) +
                    serializedText +
                (markup.length === 3 ? (
                    getTag('ept', 'l' + idx, markup[1][0]) +
                    getTag('bpt', 'l' + ++idx, markup[1][1]) +
                        token.href +
                    getTag('ept', 'l' + idx, markup[2])
                    ) : getTag('ept', idx, markup[1])
                );
        }

        if (type === 'tag') {
            var tag = htmlParser(token.text)[0];

            if (tag && tag.attrs && (tag.type === 'img' || tag.type === 'iframe')) {
                tag.attrs.src && addUnit(tag.attrs.src);
                tag.attrs.alt && addUnit(tag.attrs.alt);
                return;
            }

            return getTag('ph', idx, escape(token.text));
        }

        if (type === 'br') return getTag('ph', idx, markup);

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
