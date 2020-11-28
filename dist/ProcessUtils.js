"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.ProcessUtils = void 0;
var AssertUtils_1 = require("./AssertUtils");
var FS = require('fs');
var PATH = require('path');
var ProcessUtils = /** @class */ (function () {
    function ProcessUtils() {
    }
    ProcessUtils.parseEnvFileLine = function (obj, line) {
        AssertUtils_1["default"].isObject(obj);
        AssertUtils_1["default"].isString(line);
        if (line.indexOf('=') < 0) {
            if (line.length) {
                obj[line] = '';
            }
            return obj;
        }
        var parts = line.split('=');
        var key = parts.shift();
        AssertUtils_1["default"].isString(key);
        key = key.trim();
        if (key.length) {
            obj[key] = parts.join('=').trim();
        }
        return obj;
    };
    ProcessUtils.parseEnvFile = function (file) {
        var input = FS.readFileSync(file, { encoding: "utf-8" });
        AssertUtils_1["default"].isString(input);
        var rows = input.split('\n');
        AssertUtils_1["default"].isArray(rows);
        return rows.reduce(ProcessUtils.parseEnvFileLine, {});
    };
    ProcessUtils.initEnvFromFile = function (file) {
        var params = ProcessUtils.parseEnvFile(file);
        AssertUtils_1["default"].isObject(params);
        process.env = __assign(__assign({}, process.env), params);
    };
    ProcessUtils.initEnvFromDefaultFiles = function () {
        var file = PATH.join(process.cwd(), '.env');
        ProcessUtils.initEnvFromFile(file);
    };
    return ProcessUtils;
}());
exports.ProcessUtils = ProcessUtils;
exports["default"] = ProcessUtils;
