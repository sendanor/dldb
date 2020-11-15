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
exports.DLDBServer = exports.DLDBResponseStatus = exports.DataRequestLevel = void 0;
var HttpUtils_1 = require("./HttpUtils");
var RoutePath_1 = require("./RoutePath");
var StringUtils_1 = require("./StringUtils");
var Environment_1 = require("./Environment");
var ObjectUtils_1 = require("./ObjectUtils");
var DataRequestLevel;
(function (DataRequestLevel) {
    DataRequestLevel[DataRequestLevel["READ_ACCESS"] = 0] = "READ_ACCESS";
    DataRequestLevel[DataRequestLevel["WRITE_ACCESS"] = 1] = "WRITE_ACCESS";
})(DataRequestLevel = exports.DataRequestLevel || (exports.DataRequestLevel = {}));
var DLDBResponseStatus;
(function (DLDBResponseStatus) {
    DLDBResponseStatus["OK"] = "OK";
    DLDBResponseStatus["ERROR"] = "ERROR";
})(DLDBResponseStatus = exports.DLDBResponseStatus || (exports.DLDBResponseStatus = {}));
var DLDBServer = /** @class */ (function () {
    function DLDBServer() {
        this._serverStateOk = true;
        this._getQueue = [];
        this._postQueue = [];
        this._nodeDataRequestLevels = {};
    }
    DLDBServer._parseDataRequestLevel = function (value) {
        switch (value) {
            case 0: return DataRequestLevel.READ_ACCESS;
            case 1: return DataRequestLevel.WRITE_ACCESS;
        }
        return undefined;
    };
    DLDBServer._isIncomingDataObject = function (data) {
        var from = data === null || data === void 0 ? void 0 : data.from;
        var secret = data === null || data === void 0 ? void 0 : data.secret;
        var payload = data === null || data === void 0 ? void 0 : data.payload;
        var level = this._parseDataRequestLevel(data === null || data === void 0 ? void 0 : data.level);
        return !!(secret && payload && typeof secret === 'string'
            && from && typeof from === 'string'
            && typeof payload === 'object' && !(payload instanceof Array)
            && level !== undefined && typeof level === 'number');
    };
    DLDBServer._isIncomingDataRequestObject = function (data) {
        var from = data === null || data === void 0 ? void 0 : data.from;
        var level = this._parseDataRequestLevel(data === null || data === void 0 ? void 0 : data.level);
        return !!(from && typeof from === 'string'
            && level !== undefined && typeof level === 'number');
    };
    DLDBServer._getTargetByRandom = function (targets) {
        return Math.floor(Math.random() * Math.floor(targets));
    };
    DLDBServer._getNextTargetByRandom = function (targets) {
        // FIXME: Change to use crypto module
        return targets[this._getTargetByRandom(targets.length)];
    };
    /**
     * Send processed data to node(s)
     *
     * @param data
     * @param targetUrl
     */
    DLDBServer.prototype.sendDataToSingleTarget = function (data, targetUrl) {
        var _this = this;
        var url = "" + targetUrl + RoutePath_1["default"].INCOMING_DATA;
        return HttpUtils_1["default"].request(HttpUtils_1.HttpMethod.POST, url, data).then(function (responseData) {
            if (ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeDataRequestLevels, targetUrl)) {
                if (data.level === DataRequestLevel.WRITE_ACCESS) {
                    delete _this._nodeDataRequestLevels[targetUrl];
                    console.log("Sent writable data to " + targetUrl + ": It's no longer marked to wait for data");
                }
                else if (_this._nodeDataRequestLevels[targetUrl] === DataRequestLevel.READ_ACCESS) {
                    delete _this._nodeDataRequestLevels[targetUrl];
                    console.log("Sent read-only data (" + data.level + ") to " + targetUrl + ": It's no longer marked to wait for data");
                }
                else {
                    console.log("Sent read-only data (" + data.level + ") to " + targetUrl + ": It's still waiting writable data (" + _this._nodeDataRequestLevels[targetUrl] + ")");
                }
                // } else if (data.level === DataRequestLevel.READ_ACCESS) {
                //
                //     console.warn('We were not waiting for readonly data.');
            }
            if (!_this._serverStateOk && (responseData === null || responseData === void 0 ? void 0 : responseData.status) === DLDBResponseStatus.OK) {
                _this._serverStateOk = true;
                console.log(url + " [SUCCESS]: Node state OK");
            }
            else {
                if ((responseData === null || responseData === void 0 ? void 0 : responseData.status) !== DLDBResponseStatus.OK) {
                    console.log(url + " [SUCCESS]: ", responseData);
                }
            }
        })["catch"](function (err) {
            console.error(url + " [FAIL]: ", err);
            _this._serverStateOk = false;
            return Promise.reject(err);
        });
    };
    DLDBServer.prototype._getTargetsRequestingWriteAccess = function () {
        var _this = this;
        return Object.keys(this._nodeDataRequestLevels).filter(function (targetUrl) {
            var targetLevel = _this._nodeDataRequestLevels[targetUrl];
            return targetLevel === DataRequestLevel.WRITE_ACCESS;
        });
    };
    DLDBServer.prototype._getTargetsRequestingReadAccess = function () {
        var _this = this;
        return Object.keys(this._nodeDataRequestLevels).filter(function (targetUrl) {
            var targetLevel = _this._nodeDataRequestLevels[targetUrl];
            return targetLevel === DataRequestLevel.READ_ACCESS;
        });
    };
    DLDBServer.prototype._getTargetsRequestingReadOrWriteAccess = function () {
        return Object.keys(this._nodeDataRequestLevels);
    };
    DLDBServer.prototype._getNextTargetByRequest = function (level, targets) {
        if (level === DataRequestLevel.WRITE_ACCESS) {
            var targetsWantingWriteAccess = this._getTargetsRequestingWriteAccess();
            if (targetsWantingWriteAccess.length) {
                var target_1 = DLDBServer._getNextTargetByRandom(targetsWantingWriteAccess);
                console.log(targetsWantingWriteAccess.length + " nodes requested write access, picked: " + target_1 + (targetsWantingWriteAccess.length >= 2 ? ' by random' : ''));
                return target_1;
            }
        }
        var targetsWantingAnyAccess = this._getTargetsRequestingReadOrWriteAccess();
        if (targetsWantingAnyAccess.length) {
            var target_2 = DLDBServer._getNextTargetByRandom(targetsWantingAnyAccess);
            console.log(targetsWantingAnyAccess.length + " nodes requested read access, picked: " + target_2 + (targetsWantingAnyAccess.length >= 2 ? ' by random' : ''));
            return target_2;
        }
        if (targets.length === 1) {
            return targets[0];
        }
        var target = DLDBServer._getNextTargetByRandom(targets);
        //console.log(`Picked next target ${target} by random.`);
        return target;
    };
    /**
     * Send processed data to node(s)
     *
     * @param data
     * @param targets
     */
    DLDBServer.prototype.sendDataToOneOfTargets = function (data, targets) {
        var _this = this;
        if (!DLDBServer._isIncomingDataObject(data)) {
            throw new TypeError('Cannot send invalid data object');
        }
        var targetUrl = this._getNextTargetByRequest(data.level, targets);
        this.sendDataToSingleTarget(data, targetUrl)["catch"](function () {
            if (data.level === DataRequestLevel.WRITE_ACCESS) {
                _this.sendDataToOneOfTargets(data, targets);
            }
        });
        return targetUrl;
    };
    /**
     * Notify remote node about our need for data
     *
     * @param level
     * @param targets
     */
    DLDBServer.sendDataRequest = function (level, targets) {
        targets.forEach(function (targetUrl) {
            var url = "" + targetUrl + RoutePath_1["default"].INCOMING_DATA_REQUEST;
            HttpUtils_1["default"].request(HttpUtils_1.HttpMethod.POST, url, { from: Environment_1.DLDB_PUBLIC_URL, level: level }).then(function (data) {
                console.log(url + " [SUCCESS]: ", data.status);
            })["catch"](function (err) {
                console.error(url + " [FAIL]: ", err);
            });
        });
    };
    /**
     * Processes incoming data from another DLDB node.
     *
     * This node will execute queued operations on the received data.
     *
     * Returns the updated data.
     */
    DLDBServer.prototype.processIncomingDataPayload = function (level, data) {
        var newData = data;
        if (level === DataRequestLevel.WRITE_ACCESS) {
            while (this._postQueue.length) {
                var item = this._postQueue.shift();
                var oldData = data;
                newData = __assign(__assign({}, data), item.input);
                console.log('DLDB state changed from ', oldData, ' to ', newData, ' with ', item.input);
                this._getQueue.push(item);
            }
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
        // Append the request to queues
        switch (method) {
            case HttpUtils_1.HttpMethod.GET:
                this._getQueue.push({ res: res });
                DLDBServer.sendDataRequest(DataRequestLevel.READ_ACCESS, Environment_1.DLDB_NODES);
                break;
            case HttpUtils_1.HttpMethod.POST:
                HttpUtils_1["default"].parseResponseJson(req).then(function (data) {
                    _this._postQueue.push({ res: res, input: data });
                    DLDBServer.sendDataRequest(DataRequestLevel.WRITE_ACCESS, Environment_1.DLDB_NODES);
                })["catch"](function (err) { return DLDBServer.processBadRequestParseErrorResponse(res, err); });
                break;
            default:
                HttpUtils_1["default"].errorResponse(res, 405, 'Method not supported');
        }
    };
    /**
     * Process incoming data
     */
    DLDBServer.prototype.processIncomingData = function (res, data) {
        var _this = this;
        var _a;
        var passphrase = data.secret;
        if (!passphrase || (StringUtils_1["default"].sha512(passphrase) !== Environment_1.DLDB_INCOMING_SECRET)) {
            HttpUtils_1["default"].errorResponse(res, 403, 'Access Denied', { status: DLDBResponseStatus.ERROR });
            return;
        }
        // FIXME: Implement better a security check to validate where the request originated
        var from = data.from;
        if (!Environment_1.DLDB_NODES.some(function (item) { return item === from; })) {
            return DLDBServer.processBadRequestInvalidObjectContentResponse(res);
        }
        // Clear the data request state since clearly the packet just came from there
        if (ObjectUtils_1.ObjectUtils.hasProperty(this._nodeDataRequestLevels, from)) {
            if (data.level === DataRequestLevel.WRITE_ACCESS) {
                delete this._nodeDataRequestLevels[from];
                console.log(from + " no longer marked to want data, since we received writable data from there.");
            }
            if (data.level === DataRequestLevel.READ_ACCESS && this._nodeDataRequestLevels[from] === DataRequestLevel.READ_ACCESS) {
                delete this._nodeDataRequestLevels[from];
                console.log(from + " no longer marked to want data, since we received read only data from there.");
            }
        }
        var payload = (_a = data.payload) !== null && _a !== void 0 ? _a : {};
        var newData = this.processIncomingDataPayload(data.level, payload);
        HttpUtils_1["default"].jsonResponse(res, 200, { status: DLDBResponseStatus.OK });
        if (data.level === DataRequestLevel.WRITE_ACCESS) {
            if (this._getTargetsRequestingReadOrWriteAccess().length) {
                var writeTarget_1 = this.sendDataToOneOfTargets({
                    from: Environment_1.DLDB_PUBLIC_URL,
                    secret: passphrase,
                    level: DataRequestLevel.WRITE_ACCESS,
                    payload: newData
                }, Environment_1.DLDB_NODES);
                var readOnlyTargets = this._getTargetsRequestingReadAccess().filter(function (item) { return item !== writeTarget_1; });
                if (readOnlyTargets.length) {
                    readOnlyTargets.forEach(function (readTarget) {
                        _this.sendDataToOneOfTargets({
                            from: Environment_1.DLDB_PUBLIC_URL,
                            secret: passphrase,
                            level: DataRequestLevel.READ_ACCESS,
                            payload: newData
                        }, [readTarget]);
                    });
                }
            }
            else {
                setTimeout(function () {
                    _this.sendDataToOneOfTargets({
                        from: Environment_1.DLDB_PUBLIC_URL,
                        secret: passphrase,
                        level: DataRequestLevel.WRITE_ACCESS,
                        payload: newData
                    }, Environment_1.DLDB_NODES);
                }, Environment_1.DLDB_SEND_DELAY);
            }
        }
    };
    /**
     * Process request for incoming data
     */
    DLDBServer.prototype.processIncomingDataRequest = function (res, data) {
        // FIXME: Implement a security check to validate where the request originated
        var from = data.from;
        if (!Environment_1.DLDB_NODES.some(function (item) { return item === from; })) {
            return DLDBServer.processBadRequestInvalidObjectContentResponse(res);
        }
        var level = data.level;
        var changed = false;
        if (ObjectUtils_1.ObjectUtils.hasProperty(this._nodeDataRequestLevels, from)) {
            if (level > this._nodeDataRequestLevels[from]) {
                this._nodeDataRequestLevels[from] = level;
                changed = true;
                console.log(from + " is waiting for writable data (" + level + ") now");
            }
        }
        else {
            this._nodeDataRequestLevels[from] = level;
            changed = true;
            if (level === DataRequestLevel.WRITE_ACCESS) {
                console.log(from + " is waiting for writable data (" + level + ") now");
            }
            else {
                console.log(from + " is waiting for read-only data (" + level + ") now");
            }
        }
        if (!changed) {
            console.warn(from + " notified us, but we knew it already.");
        }
        HttpUtils_1["default"].jsonResponse(res, 200, { status: DLDBResponseStatus.OK, changed: changed });
    };
    /**
     * Process HTTP server request
     *
     * @param req
     * @param res
     */
    DLDBServer.prototype.preProcessRequest = function (req, res) {
        var _this = this;
        try {
            var url = req.url;
            var method = HttpUtils_1["default"].parseHttpMethod(req.method);
            switch (url) {
                case RoutePath_1["default"].INCOMING_DATA:
                    HttpUtils_1["default"].parseResponseJson(req).then(function (data) {
                        if (DLDBServer._isIncomingDataObject(data)) {
                            _this.processIncomingData(res, data);
                        }
                        else {
                            DLDBServer.processBadRequestInvalidObjectResponse(res);
                            console.log('Invalid Object: ', data);
                        }
                    })["catch"](function (err) { return DLDBServer.processBadRequestParseErrorResponse(res, err); });
                    break;
                case RoutePath_1["default"].INCOMING_DATA_REQUEST:
                    HttpUtils_1["default"].parseResponseJson(req).then(function (data) {
                        if (DLDBServer._isIncomingDataRequestObject(data)) {
                            _this.processIncomingDataRequest(res, data);
                        }
                        else {
                            DLDBServer.processBadRequestInvalidObjectResponse(res);
                            console.log('Invalid Object: ', data);
                        }
                    })["catch"](function (err) { return DLDBServer.processBadRequestParseErrorResponse(res, err); });
                    break;
                case RoutePath_1["default"].DELAYED_DATA_REQUEST:
                    this.delayedDataRequest(method, req, res);
                    break;
                default:
                    DLDBServer.processNotFoundResponse(res);
            }
        }
        catch (err) {
            DLDBServer.processInternalErrorResponse(res, err);
        }
    };
    DLDBServer.processInternalErrorResponse = function (res, err) {
        console.error('ERROR: ', err);
        HttpUtils_1["default"].errorResponse(res, 500, 'Internal Error', { status: DLDBResponseStatus.ERROR });
    };
    DLDBServer.processNotFoundResponse = function (res) {
        HttpUtils_1["default"].errorResponse(res, 404, 'Not Found', { status: DLDBResponseStatus.ERROR });
    };
    DLDBServer.processBadRequestParseErrorResponse = function (res, err) {
        console.error('Error: ', err);
        HttpUtils_1["default"].errorResponse(res, 400, 'Bad Request: Parse Error', { status: DLDBResponseStatus.ERROR });
    };
    DLDBServer.processBadRequestInvalidObjectResponse = function (res) {
        HttpUtils_1["default"].errorResponse(res, 400, 'Bad Request: Invalid Object', { status: DLDBResponseStatus.ERROR });
    };
    DLDBServer.processBadRequestInvalidObjectContentResponse = function (res) {
        HttpUtils_1["default"].errorResponse(res, 400, 'Bad Request: Invalid Object Content', { status: DLDBResponseStatus.ERROR });
    };
    return DLDBServer;
}());
exports.DLDBServer = DLDBServer;
exports["default"] = DLDBServer;
