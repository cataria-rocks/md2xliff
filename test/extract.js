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
                '',
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
                '',
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
                '* %%%6%%%',
                '- %%%7%%%',
                '+ %%%8%%%',
                '1.  %%%9%%%',
                '2.  %%%10%%%'
            ].join('\n'));

            assertContent(xliff, [
                'First ordered list item',
                'Another item',
                'Unordered sub-list.',
                'Actual numbers',
                'Ordered sub-list',
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
                    '    # some comment. Something else.',
                    '    ls -la',
                    '    # new comment'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '    # %%%1%%% %%%2%%%',
                    '    ls -la',
                    '    # %%%3%%%'

                ].join('\n'));

                assertContent(xliff, [
                    'some comment.',
                    'Something else.',
                    'new comment'
                ]);
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
                    '# some comment. Code',
                    '```'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '```unknwn',
                    '# %%%1%%%',
                    'ls -la',
                    '# %%%2%%% %%%3%%%',
                    '```'
                ].join('\n'));

                assertContent(xliff, [
                    'some comment',
                    'some comment.',
                    'Code'
                ]);
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
                    '/* some comment. CSS code */',
                    '```'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '```css',
                    '/*%%%1%%%*/',
                    '.b1 {',
                    '    color: red;',
                    '/*%%%2%%%*/',
                    '}',
                    '/*%%%3%%% %%%4%%%*/',
                    '```'
                ].join('\n'));

                assertContent(xliff, [
                    ' some comment in CSS code ',
                    ' some multiline comment\nin CSS code ',
                    ' some comment.',
                    'CSS code '
                ]);
            });

            it('should extract HTML', function() {
                const markdown = [
                    '```html',
                    '<html>',
                    '<head>',
                    '    <style type="text/css">',
                    '        h2 {color: brown;}',
                    '        /* color is brown */',
                    '        h1 {color: green;}',
                    '        /* color is green */',
                    '    </style>',
                    '</head>',
                    '<body>',
                    '    <h2>Header</h2>',
                    '    <!-- header is h2 -->',
                    '    <script type="text/javascript">',
                    '       // add tag h1',
                    '       const arr = [];',
                    '       arr.push("Hello, World!");',
                    '       /*',
                    '           multi-line',
                    '           comments',
                    '       */',
                    '    </script>',
                    '</body>',
                    '</html>',
                    '```'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '```html',
                    '<html>',
                    '<head>',
                    '    <style type="text/css">',
                    '        h2 {color: brown;}',
                    '        /*%%%1%%%*/',
                    '        h1 {color: green;}',
                    '        /*%%%2%%%*/',
                    '    </style>',
                    '</head>',
                    '<body>',
                    '    <h2>Header</h2>',
                    '    <!--%%%3%%%-->',
                    '    <script type="text/javascript">',
                    '       //%%%4%%%',
                    '       const arr = [];',
                    '       arr.push("Hello, World!");',
                    '       /*%%%5%%%*/',
                    '    </script>',
                    '</body>',
                    '</html>',
                    '```'
                ].join('\n'));

                assertContent(xliff, [
                    ' color is brown ',
                    ' color is green ',
                    ' header is h2 ',
                    ' add tag h1',
                    '\n           multi-line\n           comments\n       '
                ]);
            });

            describe('JS', function() {
                it('should extract inline comments from valid JS', function() {
                    const markdown = [
                        '```js',
                        '// NOTE: explicitly call `init();`',
                        'var html = BEMHTML.apply({',
                        '     block : \'select\',',
                        '     mods : { mode : \'check\', theme : \'islands\', size : \'m\' }',
                        '   // returns HTML line block',
                        '});',
                        'BEMDOM.append($(\'.form\'), html)',
                        '/* returns line. Something */',
                        '```'
                    ].join('\n');

                    const { skeleton, data: xliff } = extract(markdown);

                    assert.equal(skeleton, [
                        '```js',
                        '//%%%1%%%',
                        'var html = BEMHTML.apply({',
                        '     block : \'select\',',
                        '     mods : { mode : \'check\', theme : \'islands\', size : \'m\' }',
                        '   //%%%2%%%',
                        '});',
                        'BEMDOM.append($(\'.form\'), html)',
                        '/*%%%3%%% %%%4%%%*/',
                        '```'
                    ].join('\n'));

                    assertContent(xliff, [
                        ' NOTE: explicitly call `init();`',
                        ' returns HTML line block',
                        ' returns line.',
                        'Something '
                    ]);
                });

                it('should extract block comments from valid JS', function() {
                    const markdown = [
                        '```js',
                        '/* NOTE: explicitly call `init();` */',
                        'var html = BEMHTML.apply({',
                        '     block : \'select\',',
                        '     mods : { mode : \'check\', theme : \'islands\', size : \'m\' }',
                        '});',
                        'BEMDOM.append($(\'.form\'), html)',
                        '   /*',
                        '       The code below will change',
                        '       the heading with id = "myH"',
                        '       and the paragraph with id = "myP"',
                        '       in my web page:',
                        '   */',
                        '',
                        '{',
                        '    url : \'https://bem.info/\'',
                        '}',
                        '```'
                    ].join('\n');

                    const { skeleton, data: xliff } = extract(markdown);

                    assert.equal(skeleton, [
                        '```js',
                        '/*%%%1%%%*/',
                        'var html = BEMHTML.apply({',
                        '     block : \'select\',',
                        '     mods : { mode : \'check\', theme : \'islands\', size : \'m\' }',
                        '});',
                        'BEMDOM.append($(\'.form\'), html)',
                        '   /*%%%2%%%*/',
                        '',
                        '{',
                        '    url : \'https://bem.info/\'',
                        '}',
                        '```'
                    ].join('\n'));

                    assertContent(xliff, [
                        ' NOTE: explicitly call `init();` ',
                        '\n       The code below will change\n       the heading with id = "myH"\n       and the paragraph with id = "myP"\n       in my web page:\n   '
                    ]);
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
                        ' NOTE: explicitly call `init();`',
                        ' returns HTML line'
                    ]);
                });
            });
        });

        describe('tables', function() {
            it('should extract tables', function() {
                const markdown = [
                    '| Tables        | Are           | Cool  |',
                    '| ------------- |:-------------:| -----:|',
                    '| col 3 is      | right-aligned | $1600 |',
                    '| col 2 is      | centered      |   $12 |',
                    '| zebra stripes | are neat      |     1. Some |'
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    '| %%%1%%%        | %%%2%%%           | %%%3%%%  |',
                    '| ------------- |:-------------:| -----:|',
                    '| %%%4%%%      | %%%5%%% | %%%6%%% |',
                    '| %%%7%%%      | %%%8%%%      |   %%%9%%% |',
                    '| %%%10%%% | %%%11%%%      |     %%%12%%% %%%13%%% |'
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
                    '1.',
                    'Some'
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

            it('should extract empty table cells', function() {
                const markdown = [
                    ' One | Two ',
                    ' --- | --- ',
                    '     |  some  '
                ].join('\n');

                const { skeleton, data: xliff } = extract(markdown);

                assert.equal(skeleton, [
                    ' %%%1%%% | %%%2%%% ',
                    ' --- | --- ',
                    '     |  %%%3%%%  '
                ].join('\n'));

                assertContent(xliff, [
                    'One',
                    'Two',
                    'some'

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
                'Oh, you can <bpt id="1">*</bpt>put<ept id="1">*</ept> <bpt id="2">**</bpt>Markdown<ept id="2">**</ept> into a blockquote.'
            ]);
        });

        it('should extract YouTube Videos', function() {
            const markdown = '[![IMAGE ALT](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png)](https://www.youtube.com/watch?v=COwlqqErDbY)';

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, '%%%1%%%');

            assertContent(xliff, [
                '<bpt id="1">[</bpt><bpt id="2">![</bpt>IMAGE ALT<ept id="2">]</ept><bpt id="3">(</bpt>https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png<ept id="3">)</ept><ept id="1">]</ept><bpt id="4">(</bpt>https://www.youtube.com/watch?v=COwlqqErDbY<ept id="4">)</ept>'
            ]);
        });
    });

    describe('inline markup', function() {
        it('should extract emphasis', function() {
            const markdown = [
                'Emphasis, aka italics, with *asterisks* or _underscores_.',
                'Strong emphasis, aka bold with **asterisks** or __underscores__.',
                'Strike through uses two tildes, ~~scratch this~~.',
                'Inline `code` has `back-ticks around` it.',
                'Combined emphasis with __asterisks and *underscores*__.',
                'Combined emphasis with **asterisks and _underscores_**.'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '%%%2%%%',
                '%%%3%%%',
                '%%%4%%%',
                '%%%5%%%',
                '%%%6%%%'
            ].join('\n'));

            assertContent(xliff, [
                'Emphasis, aka italics, with <bpt id="1">*</bpt>asterisks<ept id="1">*</ept> or <bpt id="2">_</bpt>underscores<ept id="2">_</ept>.',
                'Strong emphasis, aka bold with <bpt id="1">**</bpt>asterisks<ept id="1">**</ept> or <bpt id="2">__</bpt>underscores<ept id="2">__</ept>.',
                'Strike through uses two tildes, <bpt id="1">~~</bpt>scratch this<ept id="1">~~</ept>.',
                'Inline <bpt id="1">`</bpt>code<ept id="1">`</ept> has <bpt id="2">`</bpt>back-ticks around<ept id="2">`</ept> it.',
                'Combined emphasis with <bpt id="1">__</bpt>asterisks and <bpt id="2">*</bpt>underscores<ept id="2">*</ept><ept id="1">__</ept>.',
                'Combined emphasis with <bpt id="1">**</bpt>asterisks and <bpt id="2">_</bpt>underscores<ept id="2">_</ept><ept id="1">**</ept>.'
            ]);
        });

        it('should extract links', function() {
            const markdown = [
                '[Inline-style link](https://www.ya.ru)',
                '',
                '[Inline-style link with title](https://www.ya.ru "Homepage")',
                '',
                '[Inline-style. Link](https://www.ya.ru)',
                '',
                '[Reference-style link][reference text]',
                '',
                '[Relative reference to a repository file](../blob/master/LICENSE)',
                '',
                '[Numbers for reference-style link definitions][link1]',
                '',
                'Or leave it empty and use the [link itself].',
                '',
                'The library code is on Github: [https://github.com/bem/bem-component](https://github.com/bem/bem-component).',
                '',
                'Some text to show that the reference links can follow later.',
                '',
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
                '%%%9%%%',
                '',
                '[%%%10%%%]: %%%11%%%',
                '[%%%12%%%]: %%%13%%%',
                '[%%%14%%%]: %%%15%%%'
            ].join('\n'));

            assertContent(xliff, [
                '<bpt id="1">[</bpt>Inline-style link<ept id="1">]</ept><bpt id="2">(</bpt>https://www.ya.ru<ept id="2">)</ept>',
                '<bpt id="1">[</bpt>Inline-style link with title<ept id="1">]</ept><bpt id="2">(</bpt>https://www.ya.ru "Homepage"<ept id="2">)</ept>',
                '<bpt id="1">[</bpt>Inline-style. Link<ept id="1">]</ept><bpt id="2">(</bpt>https://www.ya.ru<ept id="2">)</ept>',
                '<bpt id="1">[</bpt>Reference-style link<ept id="1">]</ept><bpt id="2">[</bpt>reference text<ept id="2">]</ept>',
                '<bpt id="1">[</bpt>Relative reference to a repository file<ept id="1">]</ept><bpt id="2">(</bpt>../blob/master/LICENSE<ept id="2">)</ept>',
                '<bpt id="1">[</bpt>Numbers for reference-style link definitions<ept id="1">]</ept><bpt id="2">[</bpt>link1<ept id="2">]</ept>',
                'Or leave it empty and use the <bpt id="1">[</bpt>link itself<ept id="1">]</ept>.',
                'The library code is on Github: <bpt id="1">[</bpt>https://github.com/bem/bem-component<ept id="1">]</ept><bpt id="2">(</bpt>https://github.com/bem/bem-component<ept id="2">)</ept>.',
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
                'Inline-style: <bpt id="1">![</bpt>alt text<ept id="1">]</ept><bpt id="2">(</bpt>https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 1"<ept id="2">)</ept>',
                'Reference-style: <bpt id="1">![</bpt>alt text<ept id="1">]</ept><bpt id="2">[</bpt>logo<ept id="2">]</ept>',
                'logo',
                'https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png',
                'Logo Title Text 2'
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

        it('should extract line wrapping', function() {
            const markdown = [
                'This is sentence  ',
                'Second sentence of the paragraph',
                '',
                'This is sentence',
                '  Second sentence of the paragraph',
                '',
                'This is sentence.',
                '  Second sentence of the paragraph.',
                '       Second sentence of the paragraph'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '',
                '%%%2%%%',
                '',
                '%%%3%%%',
                '%%%4%%%',
                '%%%5%%%'
            ].join('\n'));

            assertContent(xliff, [
                'This is sentence  \nSecond sentence of the paragraph',
                'This is sentence\n  Second sentence of the paragraph',
                'This is sentence.',
                '  Second sentence of the paragraph.',
                '       Second sentence of the paragraph'
            ]);
        });
    });

    describe('extract HTML', function() {
        it('should extract HTML as valid markdown', function() {
            const markdown = [
                '<div>Block without attribute.</div>',
                '<div class = "class">Block with attribute class.</div>',
                '<div class = "class" name = "classname">Block with attributes class and name.</div>',
                '<div name = "classname">Block with attribute name.</div>',
                'Some text <em>text</em> text.',
                'Some text <em name = "classname">text</em> text.',
                'Some text <em class = "23" id = "565">text</em> text.',
                'Some text <em class = "23" name = "555">text</em> text.',
                '<!-- Text -->',
                '<!-- Text. Sentence. <div>Text</div>-->'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '<div>%%%1%%%</div>',
                '<div class = "class">%%%2%%%</div>',
                '<div class = "class" name = "%%%3%%%">%%%4%%%</div>',
                '<div name = "%%%5%%%">%%%6%%%</div>',
                '%%%7%%%',
                '%%%8%%%<em name = "%%%9%%%">%%%10%%%</em>%%%11%%%',
                '%%%12%%%',
                '%%%13%%%<em class = "23" name = "%%%14%%%">%%%15%%%</em>%%%16%%%',
                '<!--%%%17%%%-->',
                '<!--%%%18%%% %%%19%%% %%%20%%%-->'
            ].join('\n'));

            assertContent(xliff, [
                'Block without attribute.',
                'Block with attribute class.',
                'classname',
                'Block with attributes class and name.',
                'classname',
                'Block with attribute name.',
                'Some text <bpt id="1">&lt;em&gt;</bpt>text<ept id="1">&lt;/em&gt;</ept> text.',
                'Some text ',
                'classname',
                'text',
                ' text.',
                'Some text <bpt id="1">&lt;em class = "23" id = "565"&gt;</bpt>text<ept id="1">&lt;/em&gt;</ept> text.',
                'Some text ',
                '555',
                'text',
                ' text.',
                ' Text ',
                ' Text.',
                'Sentence.',
                '<div>Text</div>'
            ]);
        });

        it('should extract block HTML as valid markdown', function() {
            const markdown = [
                '<div class="b1">Block1</div>',
                '<div name="blockname">Block2</div>',
                'Some text <em>text1</em> text.',
                '',
                '<div class="b1">Block3</div>',
                '       Some text <em>text2</em> text',
                '   <p>Text1</p>',
                '       Some text <em>text3</em> text.',
                '   <p>Text2</p>',
                '',
                '<div class="b1">Some text <em>text</em> text</div>',
                '<h1>H1</h1>',
                '',
                '<!-- Text -->',
                '<img src="https://hdfon.ru/wp-content/uploads/hdfon.ru-928786631.jpg" alt="alt text"/>'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '<div class="b1">%%%1%%%</div>',
                '<div name="%%%2%%%">%%%3%%%</div>',
                '%%%4%%%',
                '',
                '<div class="b1">%%%5%%%</div>',
                '       %%%6%%%<p>%%%7%%%</p>',
                '       %%%8%%%',
                '%%%9%%%<p>%%%10%%%</p>',
                '',
                '<div class="b1">%%%11%%%</div>',
                '<h1>%%%12%%%</h1>',
                '',
                '<!--%%%13%%%-->',
                '<img src="%%%14%%%" alt="%%%15%%%"/>'
            ].join('\n'));

            assertContent(xliff, [
                'Block1',
                'blockname',
                'Block2',
                'Some text <bpt id="1">&lt;em&gt;</bpt>text1<ept id="1">&lt;/em&gt;</ept> text.',
                'Block3',
                'Some text <bpt id="1">&lt;em&gt;</bpt>text2<ept id="1">&lt;/em&gt;</ept> text\n   ',
                'Text1',
                'Some text <bpt id="1">&lt;em&gt;</bpt>text3<ept id="1">&lt;/em&gt;</ept> text.',
                '   ',
                'Text2',
                'Some text <bpt id="1">&lt;em&gt;</bpt>text<ept id="1">&lt;/em&gt;</ept> text',
                'H1',
                ' Text ',
                'https://hdfon.ru/wp-content/uploads/hdfon.ru-928786631.jpg',
                'alt text'
            ]);
        });

        it('should extract inline HTML as valid markdown', function() {
            const markdown = [
                'Example: <em>Emphasized text</em>',
                '',
                'Example: <a>Link <em>text</em></a>',
                '',
                '<i>Some text</i>',
                '',
                'Attribute <a name = "block"><strong>some text</strong></a> text',
                '',
                'Attribute <a name = "block" class ="block1">some text</a> text',
                '',
                'Attribute <a class = "block1">some text</a> text',
                '',
                '<a name = "codestring">link</a>  ',
                '**How encode the sentence?**',
                '',
                '<a href = "codestring">link.</a>',
                '',
                '<a href = "codestring" class = "block1">link</a>',
                '',
                '<img src="https://hdfon.ru/wp-content/uploads/hdfon.ru-928786631.jpg" alt="alt text"/>'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '',
                '%%%2%%%',
                '',
                '%%%3%%%',
                '',
                '%%%4%%%<a name = "%%%5%%%">%%%6%%%</a>%%%7%%%',
                '',
                '%%%8%%%<a name = "%%%9%%%" class ="block1">%%%10%%%</a>%%%11%%%',
                '',
                '%%%12%%%',
                '',
                '<a name = "%%%13%%%">%%%14%%%</a>%%%15%%%',
                '',
                '<a href = "%%%16%%%">%%%17%%%</a>',
                '',
                '<a href = "%%%18%%%" class = "block1">%%%19%%%</a>',
                '',
                '<img src="%%%20%%%" alt="%%%21%%%"/>'
            ].join('\n'));

            assertContent(xliff, [
                'Example: <bpt id="1">&lt;em&gt;</bpt>Emphasized text<ept id="1">&lt;/em&gt;</ept>',
                'Example: <bpt id="1">&lt;a&gt;</bpt>Link <bpt id="2">&lt;em&gt;</bpt>text<ept id="2">&lt;/em&gt;</ept><ept id="1">&lt;/a&gt;</ept>',
                '<bpt id="1">&lt;i&gt;</bpt>Some text<ept id="1">&lt;/i&gt;</ept>',
                'Attribute ',
                'block',
                '<bpt id="1">&lt;strong&gt;</bpt>some text<ept id="1">&lt;/strong&gt;</ept>',
                ' text',
                'Attribute ',
                'block',
                'some text',
                ' text',
                'Attribute <bpt id="1">&lt;a class = "block1"&gt;</bpt>some text<ept id="1">&lt;/a&gt;</ept> text',
                'codestring',
                'link',
                '  \n<bpt id="1">**</bpt>How encode the sentence?<ept id="1">**</ept>',
                'codestring',
                'link.',
                'codestring',
                'link',
                'https://hdfon.ru/wp-content/uploads/hdfon.ru-928786631.jpg',
                'alt text'
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
                'First level heading (i.e. h1).',
                'Any number (e.g. 0)',
                'Заголовок первого уровня т.е. "h1".'
            ].join('\n');

            const { skeleton, data: xliff } = extract(markdown);

            assert.equal(skeleton, [
                '%%%1%%%',
                '%%%2%%%',
                '%%%3%%%',
                '%%%4%%%'
            ].join('\n'));

            assertContent(xliff, [
                'First level heading i.e. h1.',
                'First level heading (i.e. h1).',
                'Any number (e.g. 0)',
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

    it('should escape slashes (#16)', function() {
        const markdown = [
            'Text \\*asterisks\\*.',
            '\\* It is asterisks.',
            '\\+ It is plus.',
            '\\_underscores\\_',
            '',
            'Text\\`backticks\\`',
            '',
            'Можно-ли-создавать-элементы-элементов-block\\elem1\\elem2.',
            'Можно-ли-создавать-элементы-элементов-block\\__elem1\\__elem2'
        ].join('\n');

        const { skeleton, data: xliff } = extract(markdown);

        assert.equal(skeleton, [
            '%%%1%%%',
            '%%%2%%%',
            '%%%3%%%',
            '%%%4%%%',
            '',
            '%%%5%%%',
            '',
            '%%%6%%%',
            '%%%7%%%'
        ].join('\n'));

        assertContent(xliff, [
            'Text \\*asterisks\\*.',
            '\\* It is asterisks.',
            '\\+ It is plus.',
            '\\_underscores\\_',
            'Text\\`backticks\\`',
            'Можно-ли-создавать-элементы-элементов-block\\elem1\\elem2.',
            'Можно-ли-создавать-элементы-элементов-block\\__elem1\\__elem2'
        ]);
    });
});
