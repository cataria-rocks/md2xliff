var xamel = require('xamel'),
    got = require('got'),
    apiUrl = 'https://translate.yandex.net/api/v1.5/tr.json/translate',
    isJustUpperCase = process.env.JUST_UPPER_CASE;

module.exports = function(xliff, opts, cb) {

function translate(unit) {
    var source = unit.find('source'),
        sourceText = source.text(true).join(''),
        sourceLang = opts.sourceLang || source.eq(0).attr('xml:lang') || 'ru',
        targetLang = opts.targetLang || unit.find('target').eq(0).attr('xml:lang') || 'en';

    if (isJustUpperCase) return unit.children[3].children = sourceText.toUpperCase();

    return got(apiUrl + '?key=' + opts.apiKey + '&lang=' + (sourceLang || 'ru') +
            '-' + (targetLang || 'en') + '&text=' + encodeURIComponent(sourceText))
        .then(function(translation) {
            unit.children[3].children = JSON.parse(translation.body).text[0];
            return unit;
        });
}

xamel.parse(xliff, { trim: false }, function (err, xml) {
    if (err) return cb(err);

    var units = xml.find('xliff/file/body/trans-unit');

    Promise.all(units.map(translate)).then(function() {
        cb(null, xamel.serialize(xml));
    }).catch(cb);
});

};
