process.env.USE_SOURCE = true;

var fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    md2xliff = require('../..'),
    sourceMdFile = path.resolve(__dirname, 'source.md'),
    sourceMd = fs.readFileSync(sourceMdFile, 'utf8'),
    extracted = md2xliff.extract(sourceMd, sourceMdFile);

md2xliff.xliffReconstruct(extracted.xliff, extracted.skeleton, function(err, translatedMd) {
    if (err) throw new Error(err);

    try {
        assert.equal(sourceMd, translatedMd);
    } catch(err) {
        console.log('Expected:', sourceMd);
        console.log('Actual result:', translatedMd);
        throw new Error(err);
    }
});
