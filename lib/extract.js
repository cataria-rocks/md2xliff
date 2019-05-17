const htmlParser = require('./html-parser'),
    xliffSerialize = require('./xliff-serialize'),
    extractComments = require('esprima-extract-comments'),
    unified = require('unified'),
    markdown = require('remark-parse'),
    frontmatter = require('remark-frontmatter'),
    parseFrontmatter = require('remark-parse-yaml');

function extract(markdownStr, markdownFileName, skeletonFilename, srcLang, trgLang) {
    markdownFileName || (markdownFileName = 'source.md');
    skeletonFilename || (skeletonFilename = markdownFileName.split('.').shift() + '.skl.md');
    srcLang || (srcLang = 'ru-RU');
    trgLang || (trgLang = 'en-US');

    const isBlock = {
            root: true,
            paragraph: true,
            list: true,
            listItem: true,
            heading: true,
            blockquote: true,
            div: true,
            p: true,
            ul: true,
            ol: true,
            li: true,
            h1: true,
            h2: true,
            h3: true,
            h4: true,
            h5: true,
            h6: true,
            table: true,
            tr: true,
            td: true,
            th: true,
            caption: true,
            br: true
        },
        isInline = {
            strong: true,
            emphasis: true,
            link: true,
            'delete': true,
            inlineCode: true,
            image: true,
            linkReference: true,
            imageReference: true
        },
        units = [],
        temp = {
            xliff: [],
            skeleton: []
        };

    let skeleton = markdownStr,
        currentSkeletonPosition = 0,
        i = 0; // generate attribute id for tags <bpt>, <ept>

    // https://github.com/cataria-rocks/md2xliff/issues/16
    parseMarkdown(markdownStr);

    const data = {
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

    function parseMarkdown(markdownString) {
        unified()
            .use(markdown)
            .use(parseFrontmatter)
            .use(frontmatter, 'yaml')
            .use(ASTtoSentencesTransformer)
            .use(Compiler)
            .processSync(markdownString);
    }

    function ASTtoSentencesTransformer() {
        return buildSentence;
    }

    function Compiler() {
        this.Compiler = Compiler;
    }

    function buildSentence(tree, file) {
        tree.children.forEach(node => {
            if (node.type === 'yaml') return onKeyValueObject(node.data.parsedValue);
            if (node.type === 'code') return onCode(node.value, node.lang);
            if (node.type === 'html') return onHTML(node, node.value);
            if (node.type === 'definition') return onDefinition(node);
            if (node.type === 'table') return onTable(node.children, file);
            if (node.type === 'text') return onText(node.value, true);
            if (node.type === 'break') return onText('  \n', true);
            if (isBlock[node.type]) {
                buildSentence(node, file);
                createString();

                return;
            }

            if (isInline[node.type]) {
                const inlineNode = getXliffAndSkeletonForInlineNode(node, file.contents);
                inlineNode.skeleton.forEach(str => temp.skeleton.push(str));
                inlineNode.xliff.forEach(str => temp.xliff.push(str));
            }
        });
    }

    function onText(segment, inline) {
        const punctuationSet = '[;\.!\?]',
            punctuationRegExp = new RegExp(`^${punctuationSet}$`),
            lowerCaseRegExp = /^["'«]*[а-яёa-z]/,
            emphasisRegExp = /^[#>_~`\*\+\-]$/;

        segment.split(new RegExp(`(${punctuationSet})\\s`)).forEach((text, id, arr) => {
            if (punctuationRegExp.test(arr[id - 1])) {
                if (lowerCaseRegExp.test(text)) {
                    text = ` ${text}`;
                } else {
                    createString();
                }
            }
            // backslash-escaping
            if (emphasisRegExp.test(text)) {
                text = `\\${text}`;
            }
            temp.skeleton.push(text);
            temp.xliff.push(text);
        });
        inline || createString();
    }

    function createString() {
        if (temp.skeleton.find(elem => elem !== '')) {
            addUnit(temp.skeleton.join(''), temp.xliff.join(''));
            temp.xliff = [];
            temp.skeleton = [];
            i = 0;
        }
    }

    function onTable(table, file) {
        table.forEach(function(row) {
            row.children.forEach(function(cell) {
                buildSentence(cell, file);
                createString();
            });
        });
    }

    function addUnit(skl, xliff) {
        const segmentCounter = units.length + 1;
        skeleton = skeleton.slice(0, currentSkeletonPosition) +
            skeleton.slice(currentSkeletonPosition).replace(skl, function(str, offset) {
                currentSkeletonPosition += offset + ('%%%' + segmentCounter + '%%%').length;

                return '%%%' + segmentCounter + '%%%';
            });

        units.push({
            id: segmentCounter,
            source: {
                lang: srcLang,
                content: xliff
            },
            target: {
                lang: trgLang
            }
        });
    }

    function onKeyValueObject(kv) {
        Object.keys(kv).forEach(key => {
            if (typeof kv[key] === 'object') {
                onKeyValueObject(kv[key]);
            } else {
                kv[key] && addUnit(kv[key], kv[key]);
            }
        });
    }

    function onCode(code, lang) {
        let comments;
        if (lang === 'css') {
            const cssCommentRegexp = /(\/\*([\s\S]*?)\*\/)/g;

            while ((comments = cssCommentRegexp.exec(code)) !== null) {
                onText(comments[2]);
            }

            return;
        }

        if (lang === 'html') {
            htmlParser(code).forEach((tag, idx, arr) => {
                tag.type === 'style' && onCode(arr[idx + 1].text, 'css');
                tag.type === 'comment' && onText(tag.text);
                tag.type === 'script' && onCode(arr[idx + 1].text, 'js');
            });

            return;
        }

        if (lang === 'js' || lang === 'javascript') {
            try {
                comments = extractComments.fromString(code);
            } catch (error) {
                try {
                    comments = extractComments.fromString('(' + code + ')');
                } catch (err) {
                    const jsCommentRegexp = /\/\/([\s\S].*)|(\/\*([\s\S]*?)\*\/)/g;
                    while ((comments = jsCommentRegexp.exec(code)) !== null) {
                        onText(comments[1] || comments[3]);
                    }

                    return;
                }
            }
            comments && comments.forEach(function(comment) {
                onText(comment.value);
            });

            return;
        }

        const genericCommentRegexp = /#\s([\s\S].*)/g;

        while ((comments = genericCommentRegexp.exec(code)) !== null) {
            onText(comments[1]);
        }
    }

    function getXliffAndSkeletonForInlineNode(node, markdownString, inline = { xliff: [], skeleton: [] }) {
        const mark = markdownString.charAt(node.position.start.offset);
        let id;

        switch (node.type) {
            case 'text':
                inline.skeleton.push(node.value);
                inline.xliff.push(node.value);
                break;

            case 'link':
                id = ++i;
                inline.skeleton.push('[');
                inline.xliff.push(getTag('bpt', id, '['));
                traverseChildren(node, markdownString, inline);
                inline.skeleton.push('](', node.url);
                node.title && inline.skeleton.push(` "${node.title}"`);
                inline.skeleton.push(')');
                inline.xliff.push(getTag('ept', id, ']'), getTag('bpt', ++i, '('), node.url);
                node.title && inline.xliff.push(` "${node.title}"`);
                inline.xliff.push(getTag('ept', i, ')'));
                break;

            case 'image':
                inline.skeleton.push('![', node.alt, '](', node.url);
                node.title && inline.skeleton.push(` "${node.title}"`);
                inline.skeleton.push(')');
                inline.xliff.push(getTag('bpt', ++i, '!['), node.alt, getTag('ept', i, ']'), getTag('bpt', ++i, '('), node.url);
                node.title && inline.xliff.push(` "${node.title}"`);
                inline.xliff.push(getTag('ept', i, ')'));
                break;

            case 'linkReference':
                id = ++i;
                inline.skeleton.push('[');
                inline.xliff.push(getTag('bpt', id, '['));
                traverseChildren(node, markdownString, inline);
                inline.skeleton.push(']');
                inline.xliff.push(getTag('ept', id, ']'));
                if (node.children[0].value !== node.identifier) {
                    inline.skeleton.push('[', node.identifier);
                    node.title && inline.skeleton.push(` "${node.title}"`);
                    inline.skeleton.push(']');
                    inline.xliff.push(getTag('bpt', ++i, '['), node.identifier);
                    node.title && inline.xliff.push(` "${node.title}"`);
                    inline.xliff.push(getTag('ept', i, ']'));
                }
                break;

            case 'imageReference':
                inline.skeleton.push('![', node.alt, '][', node.identifier);
                node.title && inline.skeleton.push(` "${node.title}"`);
                inline.skeleton.push(']');
                inline.xliff.push(getTag('bpt', ++i, '!['), node.alt, getTag('ept', i, ']'), getTag('bpt', ++i, '['), node.identifier);
                node.title && inline.xliff.push(` "${node.title}"`);
                inline.xliff.push(getTag('ept', i, ']'));
                break;

            case 'emphasis':
                id = ++i;
                inline.skeleton.push(mark);
                inline.xliff.push(getTag('bpt', id, mark));
                traverseChildren(node, markdownString, inline);
                inline.skeleton.push(mark);
                inline.xliff.push(getTag('ept', id, mark));
                break;

            case 'strong':
            case 'delete':
                id = ++i;
                inline.skeleton.push(mark + mark);
                inline.xliff.push(getTag('bpt', id, mark + mark));
                traverseChildren(node, markdownString, inline);
                inline.skeleton.push(mark + mark);
                inline.xliff.push(getTag('ept', id, mark + mark));
                break;

            case 'inlineCode':
                inline.skeleton.push(mark, node.value, mark);
                inline.xliff.push(getTag('bpt', ++i, mark), node.value, getTag('ept', i, mark));
                break;
        }

        return inline;
    }

    function traverseChildren(node, markdownString, inline) {
        node.children.forEach(child => getXliffAndSkeletonForInlineNode(child, markdownString, inline));
    }

    function onHTML(node, text) {
        // Single HTML tag
        if (/^<[^>]+>$/.test(text)) {
            const singleTag = htmlParser(text)[0] || { type: text.match(/<\/(.*)>/)[1], state: 'close' };
            HTMLTagParser(singleTag);

            return;
        }

        htmlParser(text).forEach(HTMLTagParser);
    }

    function HTMLTagParser(tag) {
        if (tag.type === 'comment') {
            onText(tag.text);

            return;
        }

        if (tag.type === 'text' && tag.text !== '\n') {
            // skip spaces for saving html layout
            onText(tag.text.replace(/^\n\s*/g, ''), true);

            return;
        }

        if (tag.state === 'open') {
            const attributes = Object.keys(tag.attrs);
            if (attributes.some(isTranslationAttr) || isBlock[tag.type]) {
                temp[tag.type] = false;
                createString();
                attributes.forEach(key => {
                    isTranslationAttr(key) && addUnit(tag.attrs[key], tag.attrs[key]);
                });
            } else {
                temp[tag.type] = ++i;
                let str = '';
                attributes.forEach(key => {
                    str += ` ${key} = "${tag.attrs[key]}"`;
                });
                temp.skeleton.push(`<${tag.type}${str}>`);
                temp.xliff.push(getTag('bpt', i, `&lt;${tag.type}${str}&gt;`));
            }

            return;
        }

        if (tag.state === 'close') {
            if (temp[tag.type]) {
                temp.skeleton.push(`</${tag.type}>`);
                temp.xliff.push(getTag('ept', temp[tag.type], `&lt;/${tag.type}&gt;`));
            } else {
                createString();
            }
        }
    }

    function onDefinition(node) {
        ['identifier', 'url', 'title'].forEach(key => {
            node[key] && addUnit(node[key], node[key]);
        });
    }

    function getTag(tag, id, content) {
        return `<${tag} id="${id}">${content}</${tag}>`;
    }

    function isTranslationAttr(name) {
        return {
            name: true,
            href: true,
            src: true,
            alt: true
        }[name];
    }
}

module.exports = extract;
