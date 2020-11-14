#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var HttpUtils_1 = require("./HttpUtils");
var Environment_1 = require("./Environment");
var DLDBServer_1 = require("./DLDBServer");
var RoutePath_1 = require("./RoutePath");
var StringUtils_1 = require("./StringUtils");
var HTTP = require('http');
var DLDB = new DLDBServer_1["default"]();
var SERVER = HTTP.createServer(function (req, res) {
    try {
        var url = req.url;
        var method = HttpUtils_1["default"].parseHttpMethod(req.method);
        switch (url) {
            case RoutePath_1["default"].INCOMING_DATA:
                HttpUtils_1["default"].parseResponseJson(req).then(function (data) {
                    var _a, _b;
                    var passphrase = (_a = data === null || data === void 0 ? void 0 : data.secret) !== null && _a !== void 0 ? _a : '';
                    if (!passphrase || (StringUtils_1["default"].sha512(passphrase) !== Environment_1.DLDB_INCOMING_SECRET)) {
                        HttpUtils_1["default"].errorResponse(res, 403, 'Access Denied', { status: DLDBServer_1.DLDBResponseStatus.ERROR });
                        return;
                    }
                    var payload = (_b = data === null || data === void 0 ? void 0 : data.payload) !== null && _b !== void 0 ? _b : {};
                    var newData = DLDB.processIncomingData(payload);
                    HttpUtils_1["default"].jsonResponse(res, 200, { status: DLDBServer_1.DLDBResponseStatus.OK });
                    setTimeout(function () {
                        DLDBServer_1["default"].sendData({
                            secret: passphrase,
                            payload: newData
                        }, Environment_1.DLDB_NODES);
                    }, Environment_1.DLDB_SEND_DELAY);
                });
                break;
            case RoutePath_1["default"].DELAYED_DATA_REQUEST:
                DLDB.delayedDataRequest(method, req, res);
                break;
            default:
                HttpUtils_1["default"].errorResponse(res, 400, 'Not Found', { status: DLDBServer_1.DLDBResponseStatus.ERROR });
        }
    }
    catch (err) {
        console.error('ERROR: ', err);
        HttpUtils_1["default"].errorResponse(res, 500, 'Internal Error', { status: DLDBServer_1.DLDBResponseStatus.ERROR });
    }
});
SERVER.listen(Environment_1.DLDB_PORT, Environment_1.DLDB_HOSTNAME, function () {
    console.log("DLDB node running at http://" + Environment_1.DLDB_HOSTNAME + ":" + Environment_1.DLDB_PORT + "/ using nodes: " + Environment_1.DLDB_NODES.join(' '));
});
