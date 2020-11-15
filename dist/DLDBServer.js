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
        this._nodeAverageSpeed = {};
        this._nodeAverageSampleSize = {};
        this._timeoutCallback = {};
        this._timeout = {};
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
        return !!(payload
            && secret && typeof secret === 'string'
            && from && typeof from === 'string'
            && typeof payload === 'object' && !(payload instanceof Array)
            && level !== undefined && typeof level === 'number');
    };
    DLDBServer._isIncomingDataRequestObject = function (data) {
        var secret = data === null || data === void 0 ? void 0 : data.secret;
        var from = data === null || data === void 0 ? void 0 : data.from;
        var level = this._parseDataRequestLevel(data === null || data === void 0 ? void 0 : data.level);
        return !!(from && typeof from === 'string'
            && secret && typeof secret === 'string'
            && level !== undefined && typeof level === 'number');
    };
    DLDBServer._getTargetByRandom = function (targets) {
        return Math.floor(Math.random() * Math.floor(targets));
    };
    DLDBServer._getNextTargetByRandom = function (targets) {
        // FIXME: Change to use crypto module
        return targets[this._getTargetByRandom(targets.length)];
    };
    DLDBServer.prototype._getSlowestTarget = function (targets) {
        var _this = this;
        var sortedTargets = [].concat(targets);
        sortedTargets = sortedTargets.filter(function (item) {
            var averageA = ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeAverageSpeed, item) ? _this._nodeAverageSpeed[item] : 0;
            return averageA >= Environment_1.DLDB_MINIMUM_NETWORK_DELAY;
        });
        if (!sortedTargets.length) {
            return DLDBServer._getNextTargetByRandom(targets);
        }
        sortedTargets.sort(function (aTarget, bTarget) {
            var averageA = ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeAverageSpeed, aTarget) ? _this._nodeAverageSpeed[aTarget] : 0;
            var averageB = ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeAverageSpeed, bTarget) ? _this._nodeAverageSpeed[bTarget] : 0;
            if (averageA < Environment_1.DLDB_MINIMUM_NETWORK_DELAY) {
                averageA = Environment_1.DLDB_MINIMUM_NETWORK_DELAY;
            }
            if (averageB < Environment_1.DLDB_MINIMUM_NETWORK_DELAY) {
                averageB = Environment_1.DLDB_MINIMUM_NETWORK_DELAY;
            }
            if (averageA === averageB) {
                return 0;
            }
            return averageA < averageB ? 1 : -1;
        });
        // console.log( 'SORTED: ' + sortedTargets.map(item => {
        //     const speed = ObjectUtils.hasProperty(this._nodeAverageSpeed, item) ? this._nodeAverageSpeed[item] : 0;
        //     return `${item} with ${speed} ms`;
        // }).join(', ') );
        var firstTarget = sortedTargets[0];
        var firstAverage = "" + Math.round(ObjectUtils_1.ObjectUtils.hasProperty(this._nodeAverageSpeed, firstTarget) ? this._nodeAverageSpeed[firstTarget] : 0);
        var identicalTargets = sortedTargets.filter(function (item) {
            var itemAverage = "" + Math.round(ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeAverageSpeed, item) ? _this._nodeAverageSpeed[item] : 0);
            return firstAverage === itemAverage;
        });
        if (identicalTargets.length >= 2) {
            return DLDBServer._getNextTargetByRandom(identicalTargets);
        }
        return sortedTargets[0];
    };
    /**
     * Send processed data to node(s)
     *
     * @param data
     * @param targetUrl
     * @param resourceId
     */
    DLDBServer.prototype.sendDataToSingleTarget = function (data, targetUrl, resourceId) {
        var _this = this;
        var startTime = Date.now();
        var url = "" + targetUrl + RoutePath_1["default"].INCOMING_DATA + "/" + resourceId;
        return HttpUtils_1["default"].request(HttpUtils_1.HttpMethod.POST, url, data).then(function (responseData) {
            var endTime = Date.now();
            var duration = endTime - startTime;
            if (ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeDataRequestLevels, targetUrl)
                && ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeDataRequestLevels[targetUrl], resourceId)) {
                var levels = _this._nodeDataRequestLevels[targetUrl];
                if (data.level === DataRequestLevel.WRITE_ACCESS) {
                    delete levels[resourceId];
                    console.log("[" + resourceId + "] [" + duration + " ms] [" + resourceId + "] Sent writable data to " + targetUrl + ": It's no longer marked to wait for data");
                }
                else if (levels[resourceId] === DataRequestLevel.READ_ACCESS) {
                    delete levels[resourceId];
                    console.log("[" + resourceId + "] [" + duration + " ms] [" + resourceId + "] Sent read-only data (" + data.level + ") to " + targetUrl + ": It's no longer marked to wait for data");
                }
                else {
                    console.log("[" + resourceId + "] [" + duration + " ms] [" + resourceId + "] Sent read-only data (" + data.level + ") to " + targetUrl + ": It's still waiting writable data (" + levels[resourceId] + ")");
                }
                if (Object.keys(levels).length <= 0) {
                    delete _this._nodeDataRequestLevels[targetUrl];
                }
                // } else if (data.level === DataRequestLevel.READ_ACCESS) {
                //
                //     console.warn('We were not waiting for readonly data.');
            }
            if (!_this._serverStateOk && (responseData === null || responseData === void 0 ? void 0 : responseData.status) === DLDBResponseStatus.OK) {
                _this._serverStateOk = true;
                console.log("[" + resourceId + "] [" + duration + " ms] " + url + " [SUCCESS]: Node state OK");
            }
            else {
                if ((responseData === null || responseData === void 0 ? void 0 : responseData.status) !== DLDBResponseStatus.OK) {
                    console.log("[" + resourceId + "] [" + duration + " ms] " + url + " [SUCCESS]: ", responseData);
                }
            }
            // Update time averages
            if (!ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeAverageSampleSize, targetUrl)) {
                _this._nodeAverageSampleSize[targetUrl] = 1;
                _this._nodeAverageSpeed[targetUrl] = duration;
            }
            else {
                var prevSampleSize = _this._nodeAverageSampleSize[targetUrl];
                var prevAverageSpeed = _this._nodeAverageSpeed[targetUrl];
                var newAverageSpeed = _this._nodeAverageSpeed[targetUrl] = prevAverageSpeed + (duration - prevAverageSpeed) / (prevSampleSize + 1);
                if ("" + Math.round(newAverageSpeed / 100) !== "" + Math.round(prevAverageSpeed / 100)) {
                    console.log("[" + resourceId + "] Node " + targetUrl + " average speed updated as " + newAverageSpeed + " ms (from " + prevAverageSpeed + ")");
                }
            }
        })["catch"](function (err) {
            console.error("[" + resourceId + "] " + url + " [FAIL]: ", err);
            _this._serverStateOk = false;
            return Promise.reject(targetUrl);
        });
    };
    DLDBServer.prototype._getTargetsRequestingWriteAccess = function (resourceId) {
        var _this = this;
        return Object.keys(this._nodeDataRequestLevels).filter(function (targetUrl) {
            if (!ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeDataRequestLevels[targetUrl], resourceId)) {
                return false;
            }
            var targetLevel = _this._nodeDataRequestLevels[targetUrl][resourceId];
            return targetLevel === DataRequestLevel.WRITE_ACCESS;
        });
    };
    DLDBServer.prototype._getTargetsRequestingReadAccess = function (resourceId) {
        var _this = this;
        return Object.keys(this._nodeDataRequestLevels).filter(function (targetUrl) {
            if (!ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeDataRequestLevels[targetUrl], resourceId)) {
                return false;
            }
            var targetLevel = _this._nodeDataRequestLevels[targetUrl][resourceId];
            return targetLevel === DataRequestLevel.READ_ACCESS;
        });
    };
    DLDBServer.prototype._getTargetsRequestingReadOrWriteAccess = function (resourceId) {
        var _this = this;
        return Object.keys(this._nodeDataRequestLevels).filter(function (targetUrl) {
            return ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeDataRequestLevels[targetUrl], resourceId);
        });
    };
    DLDBServer.prototype._getNextTargetByRequest = function (level, targets, resourceId) {
        if (level === DataRequestLevel.WRITE_ACCESS) {
            var targetsWantingWriteAccess = this._getTargetsRequestingWriteAccess(resourceId);
            if (targetsWantingWriteAccess.length) {
                var target = DLDBServer._getNextTargetByRandom(targetsWantingWriteAccess);
                console.log("[" + resourceId + "] " + targetsWantingWriteAccess.length + " nodes requested write access, picked: " + target + (targetsWantingWriteAccess.length >= 2 ? ' by random' : ''));
                return target;
            }
        }
        var targetsWantingAnyAccess = this._getTargetsRequestingReadOrWriteAccess(resourceId);
        if (targetsWantingAnyAccess.length) {
            var target = DLDBServer._getNextTargetByRandom(targetsWantingAnyAccess);
            console.log("[" + resourceId + "] " + targetsWantingAnyAccess.length + " nodes requested read access, picked: " + target + (targetsWantingAnyAccess.length >= 2 ? ' by random' : ''));
            return target;
        }
        if (targets.length === 1) {
            return targets[0];
        }
        return this._getSlowestTarget(targets);
    };
    /**
     * Send processed data to node(s)
     *
     * @param data
     * @param targets
     * @param resourceId
     */
    DLDBServer.prototype.sendDataToOneOfTargets = function (data, targets, resourceId) {
        var _this = this;
        if (!DLDBServer._isIncomingDataObject(data)) {
            throw new TypeError('[' + resourceId + '] Cannot send invalid data object');
        }
        var targetUrl = this._getNextTargetByRequest(data.level, targets, resourceId);
        this.sendDataToSingleTarget(data, targetUrl, resourceId)["catch"](function (failedTarget) {
            if (data.level === DataRequestLevel.WRITE_ACCESS) {
                if (ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeAverageSpeed, failedTarget)) {
                    delete _this._nodeAverageSpeed[failedTarget];
                }
                if (ObjectUtils_1.ObjectUtils.hasProperty(_this._nodeAverageSampleSize, failedTarget)) {
                    delete _this._nodeAverageSampleSize[failedTarget];
                }
                _this.sendDataToOneOfTargets(data, targets, resourceId);
            }
        });
        return targetUrl;
    };
    /**
     * Notify remote node about our need for data
     *
     * @param level
     * @param targets
     * @param resourceId
     * @param secret
     */
    DLDBServer.sendDataRequest = function (level, targets, resourceId, secret) {
        targets.forEach(function (targetUrl) {
            var url = "" + targetUrl + RoutePath_1["default"].INCOMING_DATA_REQUEST + "/" + resourceId;
            HttpUtils_1["default"].request(HttpUtils_1.HttpMethod.POST, url, { secret: secret, from: Environment_1.DLDB_PUBLIC_URL, level: level }).then(function (data) {
                console.log("[" + resourceId + "] " + url + " [SUCCESS]: ", data.status);
            })["catch"](function (err) {
                console.error("[" + resourceId + "] " + url + " [FAIL]: ", err);
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
    DLDBServer.prototype.processIncomingDataPayload = function (level, data, resourceId) {
        var newData = data;
        var postQueue = this._postQueue.filter(function (item) { return item.id === resourceId; });
        var getQueue = this._getQueue.filter(function (item) { return item.id === resourceId; });
        this._postQueue = this._postQueue.filter(function (item) { return item.id !== resourceId; });
        this._getQueue = this._getQueue.filter(function (item) { return item.id !== resourceId; });
        if (level === DataRequestLevel.WRITE_ACCESS) {
            while (postQueue.length) {
                var item = postQueue.shift();
                var oldData = data;
                newData = __assign(__assign({}, data), item.input);
                console.log("[" + resourceId + "] DLDB state changed from ", oldData, ' to ', newData, ' with ', item.input);
                getQueue.push(item);
            }
        }
        while (getQueue.length) {
            var item = getQueue.shift();
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
     * @param resourceId
     */
    DLDBServer.prototype.delayedDataRequest = function (method, req, res, resourceId) {
        var _this = this;
        // Append the request to queues
        switch (method) {
            case HttpUtils_1.HttpMethod.GET:
                this._getQueue.push({ res: res, id: resourceId });
                DLDBServer.sendDataRequest(DataRequestLevel.READ_ACCESS, Environment_1.DLDB_NODES, resourceId, Environment_1.DLDB_REQUEST_SECRET);
                this._clearTimeout(resourceId);
                break;
            case HttpUtils_1.HttpMethod.POST:
                HttpUtils_1["default"].parseResponseJson(req).then(function (data) {
                    _this._postQueue.push({ res: res, input: data, id: resourceId });
                    DLDBServer.sendDataRequest(DataRequestLevel.WRITE_ACCESS, Environment_1.DLDB_NODES, resourceId, Environment_1.DLDB_REQUEST_SECRET);
                    _this._clearTimeout(resourceId);
                })["catch"](function (err) { return DLDBServer.processBadRequestParseErrorResponse(res, err); });
                break;
            default:
                HttpUtils_1["default"].errorResponse(res, 405, 'Method not supported');
        }
    };
    /**
     * Process incoming data
     */
    DLDBServer.prototype.processIncomingData = function (res, data, resourceId) {
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
            if (ObjectUtils_1.ObjectUtils.hasProperty(this._nodeDataRequestLevels[from], resourceId)) {
                if (data.level === DataRequestLevel.WRITE_ACCESS) {
                    delete this._nodeDataRequestLevels[from][resourceId];
                    console.log(from + " no longer marked to want data, since we received writable data from there.");
                }
                if (data.level === DataRequestLevel.READ_ACCESS && this._nodeDataRequestLevels[from][resourceId] === DataRequestLevel.READ_ACCESS) {
                    delete this._nodeDataRequestLevels[from][resourceId];
                    console.log(from + " no longer marked to want data, since we received read only data from there.");
                }
                if (Object.keys(this._nodeDataRequestLevels[from]).length <= 0) {
                    delete this._nodeDataRequestLevels[from];
                }
            }
        }
        var payload = (_a = data.payload) !== null && _a !== void 0 ? _a : {};
        var newData = this.processIncomingDataPayload(data.level, payload, resourceId);
        HttpUtils_1["default"].jsonResponse(res, 200, { status: DLDBResponseStatus.OK });
        if (data.level === DataRequestLevel.WRITE_ACCESS) {
            if (this._getTargetsRequestingReadOrWriteAccess(resourceId).length) {
                var writeTarget_1 = this.sendDataToOneOfTargets({
                    from: Environment_1.DLDB_PUBLIC_URL,
                    secret: passphrase,
                    level: DataRequestLevel.WRITE_ACCESS,
                    payload: newData
                }, Environment_1.DLDB_NODES, resourceId);
                var readOnlyTargets = this._getTargetsRequestingReadAccess(resourceId).filter(function (item) { return item !== writeTarget_1; });
                if (readOnlyTargets.length) {
                    readOnlyTargets.forEach(function (readTarget) {
                        _this.sendDataToOneOfTargets({
                            from: Environment_1.DLDB_PUBLIC_URL,
                            secret: passphrase,
                            level: DataRequestLevel.READ_ACCESS,
                            payload: newData
                        }, [readTarget], resourceId);
                    });
                }
            }
            else {
                this._clearTimeout(resourceId);
                this._timeoutCallback[resourceId] = function () {
                    delete _this._timeout[resourceId];
                    delete _this._timeoutCallback[resourceId];
                    _this.sendDataToOneOfTargets({
                        from: Environment_1.DLDB_PUBLIC_URL,
                        secret: passphrase,
                        level: DataRequestLevel.WRITE_ACCESS,
                        payload: newData
                    }, Environment_1.DLDB_NODES, resourceId);
                };
                this._timeout[resourceId] = setTimeout(this._timeoutCallback[resourceId], Environment_1.DLDB_SEND_DELAY);
            }
        }
    };
    DLDBServer.prototype._clearTimeout = function (resourceId) {
        if (ObjectUtils_1.ObjectUtils.hasProperty(this._timeout, resourceId)) {
            clearTimeout(this._timeout[resourceId]);
            delete this._timeout[resourceId];
        }
        if (ObjectUtils_1.ObjectUtils.hasProperty(this._timeoutCallback, resourceId)) {
            this._timeoutCallback[resourceId]();
            delete this._timeoutCallback[resourceId];
        }
    };
    /**
     * Process request for incoming data
     */
    DLDBServer.prototype.processIncomingDataRequest = function (res, data, resourceId) {
        var _a;
        var passphrase = data === null || data === void 0 ? void 0 : data.secret;
        if (!passphrase || (passphrase !== Environment_1.DLDB_REQUEST_SECRET)) {
            HttpUtils_1["default"].errorResponse(res, 403, 'Access Denied', { status: DLDBResponseStatus.ERROR });
            return;
        }
        var from = data.from;
        if (!Environment_1.DLDB_NODES.some(function (item) { return item === from; })) {
            return DLDBServer.processBadRequestInvalidObjectContentResponse(res);
        }
        var level = data.level;
        var changed = false;
        if (ObjectUtils_1.ObjectUtils.hasProperty(this._nodeDataRequestLevels, from)) {
            if (ObjectUtils_1.ObjectUtils.hasProperty(this._nodeDataRequestLevels[from], resourceId)) {
                if (level > this._nodeDataRequestLevels[from][resourceId]) {
                    this._nodeDataRequestLevels[from][resourceId] = level;
                    changed = true;
                    console.log("[" + resourceId + "] " + from + " is waiting for writable data (" + level + ") now");
                }
            }
        }
        else {
            this._nodeDataRequestLevels[from] = (_a = {}, _a[resourceId] = level, _a);
            changed = true;
            if (level === DataRequestLevel.WRITE_ACCESS) {
                console.log("[" + resourceId + "] " + from + " is waiting for writable data (" + level + ") now");
            }
            else {
                console.log("[" + resourceId + "] " + from + " is waiting for read-only data (" + level + ") now");
            }
        }
        if (!changed) {
            console.warn("[" + resourceId + "] " + from + " notified us, but we knew it already.");
        }
        else {
            this._clearTimeout(resourceId);
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
            // Handles incoming data
            if (url.startsWith(RoutePath_1["default"].INCOMING_DATA + '/')) {
                var resourceId_1 = DLDBServer.parseResourceId(url, RoutePath_1["default"].INCOMING_DATA + '/');
                if (resourceId_1) {
                    HttpUtils_1["default"].parseResponseJson(req).then(function (data) {
                        if (DLDBServer._isIncomingDataObject(data)) {
                            _this.processIncomingData(res, data, resourceId_1);
                        }
                        else {
                            DLDBServer.processBadRequestInvalidObjectResponse(res);
                            console.log("[" + resourceId_1 + "] Invalid Object: ", data);
                        }
                    })["catch"](function (err) { return DLDBServer.processBadRequestParseErrorResponse(res, err); });
                }
                else {
                    DLDBServer.processNotFoundResponse(res);
                }
                return;
            }
            // Handles requests for data to other nodes
            if (url.startsWith(RoutePath_1["default"].INCOMING_DATA_REQUEST + '/')) {
                var resourceId_2 = DLDBServer.parseResourceId(url, RoutePath_1["default"].INCOMING_DATA_REQUEST + '/');
                if (resourceId_2) {
                    HttpUtils_1["default"].parseResponseJson(req).then(function (data) {
                        if (DLDBServer._isIncomingDataRequestObject(data)) {
                            _this.processIncomingDataRequest(res, data, resourceId_2);
                        }
                        else {
                            DLDBServer.processBadRequestInvalidObjectResponse(res);
                            console.log("[" + resourceId_2 + "] Invalid Object: ", data);
                        }
                    })["catch"](function (err) { return DLDBServer.processBadRequestParseErrorResponse(res, err); });
                }
                else {
                    DLDBServer.processNotFoundResponse(res);
                }
                return;
            }
            // Handles data requests from users
            if (url.startsWith(RoutePath_1["default"].DELAYED_DATA_REQUEST)) {
                var resourceId = DLDBServer.parseResourceId(url, RoutePath_1["default"].DELAYED_DATA_REQUEST);
                if (resourceId) {
                    this.delayedDataRequest(method, req, res, resourceId);
                }
                else {
                    DLDBServer.processNotFoundResponse(res);
                }
                return;
            }
            DLDBServer.processNotFoundResponse(res);
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
    DLDBServer.parseResourceId = function (url, prefix) {
        if (!url) {
            return undefined;
        }
        if (typeof url !== 'string') {
            return undefined;
        }
        url = url.substr(prefix.length);
        if (!url) {
            return undefined;
        }
        var parts = url.split('/');
        if (parts.length <= 0) {
            return undefined;
        }
        var id = parts.shift();
        if (!this.checkUuid(id)) {
            return undefined;
        }
        return id.toLowerCase();
    };
    DLDBServer.checkUuid = function (value) {
        return /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/.test(value);
    };
    DLDBServer.prototype.close = function () {
        var _this = this;
        Object.keys(this._timeout).forEach(function (targetUrl) {
            Object.keys(_this._timeout[targetUrl]).forEach(function (resourceId) {
                _this._clearTimeout(resourceId);
            });
        });
    };
    return DLDBServer;
}());
exports.DLDBServer = DLDBServer;
exports["default"] = DLDBServer;
