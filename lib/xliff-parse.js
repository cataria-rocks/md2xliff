const xmlParse = require('./xml-parse');

module.exports = function(xliff) {
    return xmlParse(xliff, {buildPath: 'xliff/file/body/trans-unit', trim: false})
        .then(units => {
           return units.reduce((xliffData, unit) => {
                xliffData.push({
                    id: unit.attr('id'),
                    source: {
                        content: unit.find('source').text(true).join('')
                    },
                    target: {
                        content: unit.find('target').text(true).join('')
                    }
                });
                return xliffData;
            }, [])
    });
};
