"use strict";
exports.__esModule = true;
exports.StringUtils = void 0;
var CRYPTO = require('crypto');
var StringUtils = /** @class */ (function () {
    function StringUtils() {
    }
    StringUtils.isEmpty = function (value) {
        return value === '';
    };
    StringUtils.notEmpty = function (value) {
        return value !== '';
    };
    StringUtils.toLowerCase = function (value) {
        return value.toLowerCase();
    };
    StringUtils.trim = function (value) {
        return value.replace(/^ /g, "").replace(/ $/g, "");
    };
    StringUtils.sha512 = function (value) {
        var hash = CRYPTO.createHash('sha512');
        var data = hash.update(value, 'utf8');
        return data.digest('hex');
    };
    return StringUtils;
}());
exports.StringUtils = StringUtils;
exports["default"] = StringUtils;
