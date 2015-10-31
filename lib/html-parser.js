var htmlparser = require('htmlparser2');

module.exports = function(html) {
    var tree = [];

    var parser = new htmlparser.Parser({
        onprocessinginstruction: function(name, data) {
            name === '!doctype' && tree.push({
                type: 'doctype',
                text: data
            });
        },
        oncomment: function(data) {
            tree.push({
                type: 'comment',
                text: data
            });
        },
        onopentag: function(tag, attrs) {
            tree.push({
                type: tag,
                attrs: attrs,
                state: 'open'
            });
        },
        ontext: function(text) {
            tree.push({
                type: 'text',
                text: text
            });
        },
        onclosetag: function(tag) {
            tree.push({
                type: tag,
                state: 'close'
            });
        }
    }, { decodeEntities: true });

    parser.write(html);
    parser.end();

    return tree;
}
