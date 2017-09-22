const assert = require('assert');
const extract = require('../lib/extract');

function assertContent(actual, expected) {
    actual.units.forEach((unit, idx) => assert.equal(
        unit.source.content,
        typeof expected === 'string' ? expected : expected[idx])
    );
}

describe('extract', function() {
    it('should provide fallback options', function() {
        const { skeleton, data: xliff } = extract('String');
        assert.equal(skeleton, '%%%1%%%');
        assert.deepEqual(xliff, {
            markdownFileName: 'source.md',
            skeletonFilename: 'source.skl.md',
            srcLang: 'ru-RU',
            trgLang: 'en-US',
            units: [
                {
                    id: 1,
                    source: {
                        content: 'String',
                        lang: 'ru-RU'
                    },
                    target: {
                        lang: 'en-US'
                    }
                }
            ]
        });
    });

    describe('block markup', function() {
        it('should extract headers', function() {
            const markdown = [
                '# First level heading',
                '## Second level heading',
                'Alternatively, for H1 and H2, an underline-ish style:',
                'Alt-H1',
                '======',
                '',
                'Alt-H2',
                '------'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '# %%%1%%%',
                '## %%%2%%%',
                '%%%3%%%',
                '%%%4%%%',
                '======',
                '',
                '%%%5%%%',
                '------'
            ].join('\n'));

            assertContent(xliff, [
                'First level heading',
                'Second level heading',
                'Alternatively, for H1 and H2, an underline-ish style:',
                'Alt-H1',
                'Alt-H2'
            ]);
        });

        it('should extract lists', function() {
            const markdown = [
                '1. First ordered list item',
                '2. Another item',
                '   * Unordered sub-list.',
                '1. Actual numbers',
                '   1. Ordered sub-list',
                'And another item.  ',
               '   To have a line break without a paragraph, you will need to use two trailing spaces.',
                '   Note that this line is separate, but within the same paragraph.  ',
                '   (This is contrary to the typical GFM line break behaviour, where trailing spaces are not required.)',
                '* Unordered list can use asterisks',
                '- Or minuses',
                '+ Or pluses',
                '1.  First',
                '2.  Second'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '1. %%%1%%%',
                '2. %%%2%%%',
                '   * %%%3%%%',
                '1. %%%4%%%',
                '   1. %%%5%%%',
                '%%%6%%%  ',
               '   %%%7%%%',
                '   %%%8%%%  ',
                '   %%%9%%%',
                '* %%%10%%%',
                '- %%%11%%%',
                '+ %%%12%%%',
                '1.  %%%13%%%',
                '2.  %%%14%%%'
            ].join('\n'));

            assertContent(xliff, [
                'First ordered list item',
                'Another item',
                'Unordered sub-list.',
                'Actual numbers',
                'Ordered sub-list',
                'And another item.',
                'To have a line break without a paragraph, you will need to use two trailing spaces.',
                'Note that this line is separate, but within the same paragraph.',
                '(This is contrary to the typical GFM line break behaviour, where trailing spaces are not required.)',
                'Unordered list can use asterisks',
                'Or minuses',
                'Or pluses',
                'First',
                'Second'
            ]);
        });

        describe('code', function() {
            it('should extract generic code indented with four spaces', function() {
                const markdown = [
                    '    # some comment',
                    '    ls -la'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '    # %%%1%%%',
                    '    ls -la'
                ].join('\n'));

                assertContent(xliff, 'some comment');
            });

            it('should extract generic code', function() {
                const markdown = [
                    '```',
                    '# some comment',
                    'ls -la',
                    '```'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '```',
                    '# %%%1%%%',
                    'ls -la',
                    '```'
                ].join('\n'));

                assertContent(xliff, 'some comment');
            });

            it('should extract unknown code', function() {
                const markdown = [
                    '```unknwn',
                    '# some comment',
                    'ls -la',
                    '```'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '```unknwn',
                    '# %%%1%%%',
                    'ls -la',
                    '```'
                ].join('\n'));

                assertContent(xliff, 'some comment');
            });

            it('should extract CSS', function() {
                const markdown = [
                    '```css',
                    '/* some comment in CSS code */',
                    '.b1 {',
                    '    color: red;',
                    '/* some multiline comment',
                    'in CSS code */',
                    '}',
                    '```'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '```css',
                    '/* %%%1%%% */',
                    '.b1 {',
                    '    color: red;',
                    '/* %%%2%%% */',
                    '}',
                    '```'
                ].join('\n'));

                assertContent(xliff, [
                    'some comment in CSS code',
                    'some multiline comment\nin CSS code'
                ]);
            });

            describe('JS', function() {
                it('should extract inline comments from valid JS', function() {
                    const markdown = [
                        '```js',
                        '// NOTE: explicitly call `init();`',
                        'var html = BEMHTML.apply({',
                        '   { block : \'select\',',
                        '     mods : { mode : \'check\', theme : \'islands\', size : \'m\' }',
                        '   }// returns HTML line',
                        '});',
                        'BEMDOM.append($(\'.form\'), html)',
                        '```'
                    ].join('\n');

                    const { skeleton, data: xliff } = extract(markdown);

                    assert.equal(skeleton, [
                        '```js',
                        '//%%%1%%%',
                        'var html = BEMHTML.apply({',
                        '   { block : \'select\',',
                        '     mods : { mode : \'check\', theme : \'islands\', size : \'m\' }',
                        '   }//%%%2%%%',
                        '});',
                        'BEMDOM.append($(\'.form\'), html)',
                        '```'
                    ].join('\n'));

                    assertContent(xliff, [
                        ' NOTE: explicitly call <bpt id="2">`</bpt>init();<ept id="2">`</ept>',
                        ' returns HTML line'
                    ]);
                });

                it.skip('should extract block comments from valid JS', function() {
                    // TODO: support for /* ... */ comments
                });

                it('should extract invalid JS as a block', function() {
                    const markdown = [
                        '```js',
                        '// NOTE: explicitly call `init();`',
                        'var html = BEMHTML.apply({',
                        '   { block : \'select\',',
                        '     mods : { mode : \'check\', theme : \'islands\', size : \'m\' }',
                        '   }// returns HTML line',
                        'BEMDOM.append($(\'.form\'), html)',
                        '```'
                    ].join('\n');

                    const { skeleton, data: xliff } = extract(markdown);

                    assert.equal(skeleton, [
                        '```js',
                        '//%%%1%%%',
                        'var html = BEMHTML.apply({',
                        '   { block : \'select\',',
                        '     mods : { mode : \'check\', theme : \'islands\', size : \'m\' }',
                        '   }//%%%2%%%',
                        'BEMDOM.append($(\'.form\'), html)',
                        '```'
                    ].join('\n'));

                    assertContent(xliff, [
                        ' NOTE: explicitly call <bpt id="2">`</bpt>init();<ept id="2">`</ept>',
                        ' returns HTML line'
                    ]);
                });
            });

            it('should extract HTML', function() {
                const markdown = [
                    '```html',
                    '<div class="class">Text</div>',
                    '<!-- some comment -->',
                    '```'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '```html',
                    '<div class="class">Text</div>',
                    '<!--%%%1%%%-->',
                    '```'
                ].join('\n'));

                assertContent(xliff, [
                    ' some comment '
                ].join('\n'));
            });
        });

        describe('tables', function() {
            it('should extract tables', function() {
                const markdown = [
                    '| Tables        | Are           | Cool  |',
                    '| ------------- |:-------------:| -----:|',
                    '| col 3 is      | right-aligned | $1600 |',
                    '| col 2 is      | centered      |   $12 |',
                    '| zebra stripes | are neat      |     1 |'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '| %%%1%%%        | %%%2%%%           | %%%3%%%  |',
                    '| ------------- |:-------------:| -----:|',
                    '| %%%4%%%      | %%%5%%% | %%%6%%% |',
                    '| %%%7%%%      | %%%8%%%      |   %%%9%%% |',
                    '| %%%10%%% | %%%11%%%      |     %%%12%%% |'
                ].join('\n'));

                assertContent(xliff, [
                    'Tables',
                    'Are',
                    'Cool',
                    'col 3 is',
                    'right-aligned',
                    '$1600',
                    'col 2 is',
                    'centered',
                    '$12',
                    'zebra stripes',
                    'are neat',
                    '1'
                ]);
           });

           it('should extract tables with inline markdown', function() {
                const markdown = [
                    'Markdown | Less | Pretty',
                    '--- | --- | ---',
                    '*Still* | `renders` | **nicely**',
                    '1 | 2 | 3'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '%%%1%%% | %%%2%%% | %%%3%%%',
                    '--- | --- | ---',
                    '%%%4%%% | %%%5%%% | %%%6%%%',
                    '%%%7%%% | %%%8%%% | %%%9%%%'
                ].join('\n'));

                assertContent(xliff, [
                    'Markdown',
                    'Less',
                    'Pretty',
                    '<bpt id="1">*</bpt>Still<ept id="1">*</ept>',
                    '<bpt id="1">`</bpt>renders<ept id="1">`</ept>',
                    '<bpt id="1">**</bpt>nicely<ept id="1">**</ept>',
                    '1',
                    '2',
                    '3'
                ]);
           });
        });

        it('should extract blockquotes', function() {
            const markdown = [
                '> Blockquotes are very handy in email to emulate reply text.',
                '> This line is part of the same quote.',
                '',
                'Quote break.',
                '',
                '> This is a very long line that will still be quoted properly when it wraps. Oh boy let us keep writing to make sure this is long enough to actually wrap for everyone. Oh, you can *put* **Markdown** into a blockquote.'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '> %%%1%%%',
                '> %%%2%%%',
                '',
                '%%%3%%%',
                '',
                '> %%%4%%% %%%5%%% %%%6%%%'
            ].join('\n'));

            assertContent(xliff, [
                'Blockquotes are very handy in email to emulate reply text.',
                'This line is part of the same quote.',
                'Quote break.',
                'This is a very long line that will still be quoted properly when it wraps.',
                'Oh boy let us keep writing to make sure this is long enough to actually wrap for everyone.',
                'Oh, you can <bpt id="2">*</bpt>put<ept id="2">*</ept> <bpt id="4">**</bpt>Markdown<ept id="4">**</ept> into a blockquote.'
            ]);
        });

        // Same as image and link
        it('should extract YouTube Videos', function() {
            const markdown = '[![IMAGE ALT TEXT HERE](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png)](https://www.youtube.com/watch?v=COwlqqErDbY)';

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, '%%%1%%%');

            assertContent(xliff, [
                '<bpt id="l1">[</bpt><bpt id="l1">![</bpt>IMAGE ALT TEXT HERE<ept id="l1">]</ept><bpt id="l2">(</bpt>https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png<ept id="l2">)</ept><ept id="l1">]</ept><bpt id="l2">(</bpt>https://www.youtube.com/watch?v=COwlqqErDbY<ept id="l2">)</ept>'
            ]);
        });
    });

    describe('inline markup', function() {
        it('should extract emphasis', function() {
            const markdown = [
                'Emphasis, aka italics, with *asterisks* or _underscores_.',
                'Strong emphasis, aka bold, with **asterisks** or __underscores__.',
                'Strikethrough uses two tildes, ~~scratch this~~.',
                'Inline `code` has `back-ticks around` it.'
                // TODO: uncomment after migration from `marked`
                // 'Combined emphasis with **asterisks and _underscores_**.'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '%%%2%%%',
                '%%%3%%%',
                '%%%4%%%'
            ].join('\n'));

            assertContent(xliff, [
                'Emphasis, aka italics, with <bpt id="2">*</bpt>asterisks<ept id="2">*</ept> or <bpt id="4">_</bpt>underscores<ept id="4">_</ept>.',
                'Strong emphasis, aka bold, with <bpt id="2">**</bpt>asterisks<ept id="2">**</ept> or <bpt id="4">__</bpt>underscores<ept id="4">__</ept>.',
                'Strikethrough uses two tildes, <bpt id="2">~~</bpt>scratch this<ept id="2">~~</ept>.',
                'Inline <bpt id="2">`</bpt>code<ept id="2">`</ept> has <bpt id="4">`</bpt>back-ticks around<ept id="4">`</ept> it.'
            ]);
        });

        it('should extract links', function() {
            const markdown = [
                // NOTE: Одинаковые строки в квадратной и круглой скобке marked: markup: [ '[', ')' ]
                // 'The library code is on Github: [https://github.com/bem/bem-component](https://github.com/bem/bem-components).'
                '[Inline-style link](https://www.ya.ru)',
                '',
                '[Inline-style link with title](https://www.ya.ru "Homepage")',
                '',
                '[Inline-style. Link](https://www.ya.ru)',
                '',
                '[Reference-style link][Reference text]',
                '',
                '[Relative reference to a repository file](../blob/master/LICENSE)',
                '',
                '[Numbers for reference-style link definitions][link1]', // not a number
                '',
                'Or leave it empty and use the [link text itself].',
                '',
                'Some text to show that the reference links can follow later.',
                '',
                // 'URLs and URLs in angle brackets will automatically get turned into links. ',
                // 'http://www.example.com or <http://www.example.com> and sometimes ',
                // 'example.com (but not on Github, for example).' //<>
                '[reference text]: https://www.mozilla.org',
                '[link1]: http://slashdot.org',
                '[link text itself]: http://www.reddit.com'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '',
                '%%%2%%%',
                '',
                '%%%3%%%',
                '',
                '%%%4%%%',
                '',
                '%%%5%%%',
                '',
                '%%%6%%%',
                '',
                '%%%7%%%',
                '',
                '%%%8%%%',
                '',
                '[%%%9%%%]: %%%10%%%',
                '[%%%11%%%]: %%%12%%%',
                '[%%%13%%%]: %%%14%%%'
            ].join('\n'));

            assertContent(xliff, [
                '<bpt id="l1">[</bpt>Inline-style link<ept id="l1">]</ept><bpt id="l2">(</bpt>https://www.ya.ru<ept id="l2">)</ept>',
                '<bpt id="l1">[</bpt>Inline-style link with title<ept id="l1">]</ept><bpt id="l2">(</bpt>https://www.ya.ru<ept id="l2"> "Homepage")</ept>',
                '<bpt id="l1">[</bpt>Inline-style. Link<ept id="l1">]</ept><bpt id="l2">(</bpt>https://www.ya.ru<ept id="l2">)</ept>',
                '<bpt id="l1">[</bpt>Reference-style link<ept id="l1">]</ept><bpt id="l2">[</bpt>Reference text<ept id="l2">]</ept>',
                '<bpt id="l1">[</bpt>Relative reference to a repository file<ept id="l1">]</ept><bpt id="l2">(</bpt>../blob/master/LICENSE<ept id="l2">)</ept>',
                '<bpt id="l1">[</bpt>Numbers for reference-style link definitions<ept id="l1">]</ept><bpt id="l2">[</bpt>link1<ept id="l2">]</ept>',
                'Or leave it empty and use the <bpt id="l2">[</bpt>link text itself<ept id="2">]</ept>.',
                'Some text to show that the reference links can follow later.',
                'reference text',
                'https://www.mozilla.org',
                'link1',
                'http://slashdot.org',
                'link text itself',
                'http://www.reddit.com'
            ]);
        });

        it('should extract images', function() {
            const markdown = [
                'Here\'s our logo (hover to see the title text):',
                 '',
                'Inline-style: ![alt text](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 1")',
                '',
                'Reference-style: ![alt text][logo]',
                '',
                '[logo]: https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 2"'
               ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '',
                '%%%2%%%',
                '',
                '%%%3%%%',
                '',
                '[%%%4%%%]: %%%5%%% "%%%6%%%"'
            ].join('\n'));

            assertContent(xliff, [
                'Here\'s our logo (hover to see the title text):',
                'Inline-style: <bpt id="l2">![</bpt>alt text<ept id="l2">]</ept><bpt id="l3">(</bpt>https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png<ept id="l3"> "Logo Title Text 1")</ept>',
                'Reference-style: <bpt id="l2">![</bpt>alt text<ept id="l2">]</ept><bpt id="l3">[</bpt>logo<ept id="l3">]</ept>',
                'logo',
                'https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png',
                'Logo Title Text 2'
            ]);
        });

        it('should extract HTML as valid markdown', function() {
            const markdown = [
                '<div class="b1">some text</div>',
                '<!-- some comment -->',
                '<img src="some-src" alt="some-alt">',
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '<div class="b1">%%%1%%%</div>',
                '<!--%%%2%%%-->',
                '<img src="%%%3%%%" alt="%%%4%%%">'
            ].join('\n'));

            assertContent(xliff, [
                'some text',
                ' some comment ',
                'some-src',
                'some-alt'
            ]);
        });

        it('should handle Horizontal Rule', function() {
            const markdown = [
                'Three or more...',
                '',
                '---',
                '',
                'Hyphens',
                '',
                '***',
                '',
                'Asterisks',
                '',
                '___',
                '',
                'Underscores'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '',
                '---',
                '',
                '%%%2%%%',
                '',
                '***',
                '',
                '%%%3%%%',
                '',
                '___',
                '',
                '%%%4%%%'
            ].join('\n'));

            assertContent(xliff, [
                'Three or more...',
                'Hyphens',
                'Asterisks',
                'Underscores'
            ]);
        });

        it('should handle line breaks', function() {
            const markdown = [
                'Here is a line for us to start with.',
                '',
                'This line is separated from the one above by two newlines, so it will be a separate paragraph.',
                '',
                'This line is also a separate paragraph, but...',
                'This line is only separated by a single newline, so it is a separate line in the same paragraph.'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '',
                '%%%2%%%',
                '',
                '%%%3%%%',
                '%%%4%%%'
            ].join('\n'));

            assertContent(xliff, [
                'Here is a line for us to start with.',
                'This line is separated from the one above by two newlines, so it will be a separate paragraph.',
                'This line is also a separate paragraph, but...',
                'This line is only separated by a single newline, so it is a separate line in the same paragraph.'
            ]);
        });
    });

    describe('segment splitting', function() {
        it('should split segments by .!?', function() {
            const markdown = 'It was great. It was great? It was great!';

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '%%%2%%%',
                '%%%3%%%'
            ].join(' '));

            assertContent(xliff, [
                'It was great.',
                'It was great?',
                'It was great!'
            ]);
        });

        it('should not split abbreviations', function() {
            const markdown = [
                'First level heading i.e. h1.',
                'Заголовок первого уровня т.е. "h1".'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton,[
                '%%%1%%%',
                '%%%2%%%'
            ].join('\n'));

            assertContent(xliff, [
                'First level heading i.e. h1.',
                'Заголовок первого уровня т.е. "h1".'
            ]);
        });

        // https://github.com/cataria-rocks/md2xliff/issues/23
        it.skip('should split number', function() {
            const markdown = [
                'First level heading i.e. 1.',
                'First level heading i.e. (1).'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '%%%2%%%'
            ].join('\n'));

            assertContent(xliff, [
                'First level heading i.e. 1.',
                'First level heading i.e. (1).'
            ]);
        });

        it('should not split float numbers', function() {
            const markdown = [
                'Лего 2.0. появление БЭМ (2009).',
                'Лего 2.0. "появление БЭМ" (2009).',
                'Лего 2.0. Появление БЭМ (2009).',
                'Лего 2.0. "Появление БЭМ" (2009).'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '%%%2%%%',
                '%%%3%%% %%%4%%%',
                '%%%5%%% %%%6%%%'
            ].join('\n'));

            assertContent(xliff, [
                'Лего 2.0. появление БЭМ (2009).',
                'Лего 2.0. "появление БЭМ" (2009).',
                'Лего 2.0.',
                'Появление БЭМ (2009).',
                'Лего 2.0.',
                '"Появление БЭМ" (2009).'
            ]);
        });
    });

    it.skip('should escape slashes (#16)', function() {
        const markdown = [
            '# Можно-ли-создавать-элементы-элементов-block\\__elem1\\__elem2',
            // 'Можно-ли-создавать-элементы-элементов-block\\elem1\\elem2'
        ].join('\n');

        const { skeleton, data: xliff } = extract(markdown);

        // assert.equal(skeleton, [
        //     '# %%%1%%%',
        //     '%%%2%%%'
        // ].join('\n'));

        assertContent(xliff, [
            'Можно-ли-создавать-элементы-элементов-block\\<bpt id="3">__</bpt>elem1\\\\<ept id="3">__</ept>elem2',
            // 'Можно-ли-создавать-элементы-элементов-block\\elem1\\elem2'
        ]);
    });

    it('should escape string with entity', function() {
        const markdown = [
            'First level heading — H1.',
            'Second level heading \t H2.',
            'Third level heading \r H3.',
            'Fourth level heading \r\n H4.',
            'Fifth level heading ␤ H5.'
        ].join('\n');

        const { skeleton, data: xliff } = extract(markdown);

        assert.equal(skeleton, [
            '%%%1%%%',
            '%%%2%%%',
            '%%%3%%%',
            '%%%4%%%',
            '%%%5%%%'
        ].join('\n'));

        assertContent(xliff, [
            'First level heading — H1.',
            'Second level heading      H2.',
            'Third level heading \n H3.',
            'Fourth level heading \n H4.',
            'Fifth level heading \n H5.'
        ]);
    });
});
