"use strict";
exports.__esModule = true;
exports.ObjectUtils = void 0;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var ObjectUtils = /** @class */ (function () {
    function ObjectUtils() {
    }
    ObjectUtils.hasProperty = function (obj, key) {
        return !!obj && hasOwnProperty.call(obj, key);
    };
    return ObjectUtils;
}());
exports.ObjectUtils = ObjectUtils;
