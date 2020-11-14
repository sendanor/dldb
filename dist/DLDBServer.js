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
exports.DLDBServer = exports.DLDBResponseStatus = void 0;
var HttpUtils_1 = require("./HttpUtils");
var RoutePath_1 = require("./RoutePath");
var DLDBResponseStatus;
(function (DLDBResponseStatus) {
    DLDBResponseStatus["OK"] = "OK";
    DLDBResponseStatus["ERROR"] = "ERROR";
})(DLDBResponseStatus = exports.DLDBResponseStatus || (exports.DLDBResponseStatus = {}));
var DLDBServer = /** @class */ (function () {
    function DLDBServer() {
        this._getQueue = [];
        this._postQueue = [];
    }
    DLDBServer._getTargetByRandom = function (targets) {
        return Math.floor(Math.random() * Math.floor(targets));
    };
    DLDBServer.sendData = function (data, targets) {
        if (targets.length <= 0) {
            console.error('ERROR: We do not have configured nodes to send data. Data cannot persist.\n\nPlease configure using DLDB_NODES environment variable.');
            return;
        }
        var targetUrl = targets[this._getTargetByRandom(targets.length)];
        HttpUtils_1["default"].request(HttpUtils_1.HttpMethod.POST, "" + targetUrl + RoutePath_1["default"].INCOMING_DATA, data).then(function (data) {
            console.log(targetUrl + " [SUCCESS]: ", data.status);
        })["catch"](function (err) {
            console.error(targetUrl + " [FAIL]: ", err);
        });
    };
    /**
     * Processes incoming data from another DLDB node.
     *
     * This node will execute queued operations on the received data.
     *
     * Returns the updated data.
     */
    DLDBServer.prototype.processIncomingData = function (data) {
        var newData = data;
        while (this._postQueue.length) {
            var item = this._postQueue.shift();
            var oldData = data;
            newData = __assign(__assign({}, data), item.input);
            console.log('DLDB state changed from ', oldData, ' to ', newData, ' with ', item.input);
            this._getQueue.push(item);
        }
        while (this._getQueue.length) {
            var item = this._getQueue.shift();
            HttpUtils_1["default"].jsonResponse(item.res, 200, { payload: newData });
        }
        return newData;
    };
    /**
     * Request to a data in the DLDB database.
     *
     * This action will add the request to a queue to be handler later, when the data is received.
     *
     * @param method
     * @param req
     * @param res
     */
    DLDBServer.prototype.delayedDataRequest = function (method, req, res) {
        var _this = this;
        switch (method) {
            case HttpUtils_1.HttpMethod.GET:
                this._getQueue.push({ res: res });
                break;
            case HttpUtils_1.HttpMethod.POST:
                HttpUtils_1["default"].parseResponseJson(req).then(function (data) {
                    _this._postQueue.push({ res: res, input: data });
                });
                break;
            default:
                HttpUtils_1["default"].errorResponse(res, 405, 'Method not supported');
        }
    };
    return DLDBServer;
}());
exports.DLDBServer = DLDBServer;
exports["default"] = DLDBServer;
