var escape = require('escape-html'),
    marked = require('marked'),
    htmlParser = require('./html-parser'),
    isHtml = require('is-html'),
    xliffSerialize = require('./xliff-serialize'),
    postcss = require('postcss'),
    extractComments = require('esprima-extract-comments'),
    hideErrors = process.env.HIDE_ERRORS;

marked.InlineLexer = require('./InlineLexer');

function extract(markdownStr, markdownFileName, skeletonFilename, srcLang, trgLang, options) {
    markdownStr = markdownStr
        // .replace(/\\/g, '\\\\')// issue #16 ;
        // copy/paste from marked.js Lexer.prototype.lex
        .replace(/\r?\n|\r/g, '\n')
        .replace(/\t/g, '    ')
        .replace(/\u00a0/g, ' ')
        .replace(/\u2424/g, '\n');

    var skeleton = markdownStr,
        tokens = marked.lexer(markdownStr, options),
        units = [],
        segmentCounter = 0,
        position = 0;

    markdownFileName || (markdownFileName = 'source.md');
    skeletonFilename || (skeletonFilename = markdownFileName.split('.').shift() + '.skl.md');
    srcLang || (srcLang = 'ru-RU');
    trgLang || (trgLang = 'en-US');

    function addUnit(text, xml) {
        segmentCounter++;
        skeleton = skeleton.slice(0, position) + skeleton.slice(position).replace(text, function(str, offset) {
            position += offset + ('%%%' + segmentCounter + '%%%').length;
            return '%%%' + segmentCounter + '%%%';
        });
        units.push({
            id: segmentCounter,
            source: {
                lang: srcLang,
                content: xml || escape(text)
            },
            target: {
                lang: trgLang
            }
        });
    }

    function onCode(code, lang) {
        var comments;

        if (lang === 'css') {
            try {
                postcss.parse(code).walkComments(function(comment) {
                    getSegments(comment.text);
                });
            } catch(err) {
                hideErrors || console.log('postCSS was not able to parse comments. Code was saved as is.', err, code);
                getSegments(code);
            }

            return;
        }

        if (lang === 'html') {
            htmlParser(code).forEach(tag => {
                tag.type === 'comment' && getSegments(tag.text);
                // TODO:
                // support tag.type === 'script'
                // support tag.type === 'style'
            });

            return;
        }

        // FIXME: extract for bash
        if (lang !== 'js' && lang !== 'javascript') {
            var genericCommentRegexp = /#\s([\s\S].*)/g;
            while ((comments = genericCommentRegexp.exec(code)) !== null) {
                getSegments(comments[1]);
            }

            return;
        }

        try {
            comments = extractComments.fromString(code);
        } catch(err) {
            try {
                comments = extractComments.fromString('(' + code + ')');
            } catch(err) {
                hideErrors || console.log('Esprima was not able to parse comments. Fallback to regexp', err, code);

                var jsCommentRegexp = /\/\/([\s\S].*)/g;
                while ((comments = jsCommentRegexp.exec(code)) !== null) {
                    getSegments(comments[1]);
                }

                return;
            }
        }

        comments && comments.forEach(function(comment) {
            getSegments(comment.value);
        });
    }

    function onHTML(text) {
        // TODO: divide to block and inline markup first
        htmlParser(text).forEach(tag => {
            if (tag.attrs) {
                ['name', 'src', 'alt'].forEach(item => {
                    tag.attrs[item] && getSegments(tag.attrs[item]);
                });
            };

            if (tag.type === 'text' || tag.type === 'comment' ) {
                getSegments(tag.text);
            }
        });
    }

    function onTable(table) {
        table.header.forEach(function(text) {
            getSegments(text);
        });
        table.cells.forEach(function(row) {
            row.forEach(function(text) {
                getSegments(text);
            });
        });
    }

    function onText(text) {
        if (text.match(/^[\s]+$/)) return; // should extract lists. If 2 and more spaces don't addUnit

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

    function getSegments(text) {
        marked.inlineLexer(text, tokens.links, options).reduce(function(prev, curr, idx) {

            // if (curr.type === 'escape') {
            //     prev.push(curr.text.replace(/\\/g, '\\\\')); // issue #16;
            //     return prev;
            // }

            if (curr.type === 'text') {
                // Split into segments by `; `, `. `, `! ` and `? `
                return prev.concat(curr.text.split(/([;\.!\?])\s/));
            };

            if (curr.markup && curr.href) {
                prev.push(curr.markup[0] + curr.text + curr.markup[1] + curr.href + curr.markup[2]);
                return prev;
            };

            prev.push(curr.markup ?
                curr.markup[0] + curr.text + curr.markup[1] :
                curr.text
            );

            return prev;
        }, [])
        // join back false positive segment splits
        .reduce(function(prev, curr, idx, arr) {
            if (!prev.length || /^[;\.!\?]$/.test(arr[idx-1])) {
                prev.push(curr);
                return prev
            };

            prev[prev.length - 1] += curr;

            return prev;
        }, [])
        // join back false positive like `т. е.`, `т. д.`, etc
        .reduce(function(prev, curr, idx) {
            if (prev.length && curr.match(/^["'«]*[а-яёa-z]/)) {
                prev[prev.length - 1] += ' ' + curr;
            } else {
                prev.push(curr);
            }

            return prev;
        }, [])

        .forEach(onText);
    }

    tokens.forEach(function(token) {
        var type = token.type,
            text = token.text;

        if (type === 'table') return onTable(token);
        if (typeof text === 'undefined') return;
        if (type === 'code') return onCode(text, token.lang);
        // NOTE: isHtml(text) fails when there's `<script>` in text
        if (type === 'html' || isHtml(text)) return onHTML(text);

        getSegments(text);
    });

    // handle reflinks like
    // [ym]: https://github.com/ymaps/modules
    var reflinks = tokens.links;
    Object.keys(reflinks).forEach(function(linkKey) {
        var link = reflinks[linkKey];
        getSegments(linkKey);
        getSegments(link.href);
        link.title && getSegments(link.title);
    });

    var data = {
        markdownFileName: markdownFileName,
        skeletonFilename: skeletonFilename,
        srcLang: srcLang,
        trgLang: trgLang,
        units: units
    };

    return {
        skeleton: skeleton,
        xliff: xliffSerialize(data),
        data: data
    };
}

module.exports = extract;
