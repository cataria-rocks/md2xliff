const xmlParse = require('./xml-parse');

module.exports = function(xliff) {
    return xmlParse(xliff, {buildPath: 'xliff/file', trim: false})
        .then(units => {
            const unit = units.eq(0);
            return {
                markdownFileName: unit.attr('original'),
                skeletonFileName: unit.find('header/skl/external-file').eq(0).attr('href'),
                srcLang: unit.attr('source-language'),
                trgLang: unit.attr('target-language'),
                units: unit.find('body/trans-unit').map(transunit => ({
                    id: transunit.attr('id'),
                    source: {
                        content: transunit.find('source').text(true).join(''),
                        lang: transunit.find('source').eq(0).attr('xml:lang')
                    },
                    target: {
                        content: transunit.find('target').text(true).join(''),
                        lang: transunit.find('target').eq(0).attr('xml:lang')
                    }
                }))
            }
        });
};
