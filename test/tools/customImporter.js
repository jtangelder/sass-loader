'use strict';

var should = require('should');

function customImporter(path, prev) {
    path.should.equal('import-with-custom-logic');
    prev.should.match(/(sass|scss)[/\\]custom-importer\.(scss|sass)/);
    should(this).have.property('options');
    return customImporter.returnValue;
}
customImporter.returnValue = {
    contents: '.custom-imported {}'
};

module.exports = customImporter;
