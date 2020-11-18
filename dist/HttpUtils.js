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
exports.HttpUtils = exports.HttpMethod = void 0;
var StringUtils_1 = require("./StringUtils");
var HTTP = require('http');
var HttpMethod;
(function (HttpMethod) {
    HttpMethod["GET"] = "get";
    HttpMethod["POST"] = "post";
    HttpMethod["DELETE"] = "delete";
})(HttpMethod = exports.HttpMethod || (exports.HttpMethod = {}));
var HttpUtils = /** @class */ (function () {
    function HttpUtils() {
    }
    HttpUtils.parseHttpMethod = function (value) {
        value = StringUtils_1["default"].toLowerCase(value);
        switch (value) {
            case 'get': return HttpMethod.GET;
            case 'post': return HttpMethod.POST;
            case 'delete': return HttpMethod.DELETE;
        }
        return undefined;
    };
    HttpUtils.stringResponse = function (res, contentType, code, data) {
        res.statusCode = code;
        res.setHeader('Content-Type', contentType);
        res.end(data);
    };
    HttpUtils.jsonResponse = function (res, code, data) {
        var responseData;
        try {
            responseData = JSON.stringify(data, null, 2);
        }
        catch (err) {
            throw new TypeError('HttpUtils.jsonResponse: Could not stringify data');
        }
        HttpUtils.stringResponse(res, 'application/json', code, responseData);
    };
    HttpUtils.errorResponse = function (res, code, error, data) {
        if (data === void 0) { data = {}; }
        HttpUtils.jsonResponse(res, code, __assign(__assign({}, data), { code: code, error: error }));
    };
    HttpUtils.parseResponseJson = function (req) {
        return new Promise(function (resolve, reject) {
            try {
                var data_1 = [];
                req.on('data', function (chunk) {
                    data_1.push(chunk);
                });
                req.on('end', function () {
                    try {
                        resolve(JSON.parse(Buffer.concat(data_1).toString('utf8')));
                    }
                    catch (err) {
                        reject(err);
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    };
    HttpUtils.request = function (method, url, data) {
        return new Promise(function (resolve, reject) {
            var _a, _b;
            try {
                var u = new URL(url);
                var postData = JSON.stringify(data);
                var options = {
                    hostname: u.hostname,
                    port: (_a = u === null || u === void 0 ? void 0 : u.port) !== null && _a !== void 0 ? _a : 80,
                    path: (_b = u === null || u === void 0 ? void 0 : u.pathname) !== null && _b !== void 0 ? _b : '/',
                    method: method !== null && method !== void 0 ? method : 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };
                var req = HTTP.request(options, function (res) {
                    var _a;
                    try {
                        var statusCode = (_a = res === null || res === void 0 ? void 0 : res.statusCode) !== null && _a !== void 0 ? _a : 0;
                        if (statusCode >= 200 && statusCode < 300) {
                            HttpUtils.parseResponseJson(res).then(resolve)["catch"](reject);
                        }
                        else {
                            HttpUtils.parseResponseJson(res).then(reject)["catch"](reject);
                        }
                    }
                    catch (err) {
                        reject(err);
                    }
                });
                req.on('error', function (e) {
                    reject(e);
                });
                // Write data to request body
                req.write(postData);
                req.end();
            }
            catch (err) {
                reject(err);
            }
        });
    };
    return HttpUtils;
}());
exports.HttpUtils = HttpUtils;
exports["default"] = HttpUtils;
