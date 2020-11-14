"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
exports.__esModule = true;
exports.DLDB_SEND_DELAY = exports.DLDB_INCOMING_SECRET = exports.DLDB_NODES = exports.DLDB_PORT = exports.DLDB_HOSTNAME = void 0;
var StringUtils_1 = require("./StringUtils");
/**
 * Local DLDB node hostname where to listen connections
 */
exports.DLDB_HOSTNAME = (_b = (_a = process === null || process === void 0 ? void 0 : process.env) === null || _a === void 0 ? void 0 : _a.DLDB_HOSTNAME) !== null && _b !== void 0 ? _b : '0.0.0.0';
/**
 * Local DLDB node port where to listen connections
 */
exports.DLDB_PORT = parseInt((_d = (_c = process === null || process === void 0 ? void 0 : process.env) === null || _c === void 0 ? void 0 : _c.DLDB_PORT) !== null && _d !== void 0 ? _d : '3000', 10);
/**
 * Other remote nodes.
 */
exports.DLDB_NODES = ((_f = (_e = process === null || process === void 0 ? void 0 : process.env) === null || _e === void 0 ? void 0 : _e.DLDB_NODES) !== null && _f !== void 0 ? _f : '').split(' ').map(StringUtils_1["default"].trim).filter(StringUtils_1["default"].notEmpty);
/**
 * Secret which you must know to send the first incoming data packet.
 *
 * This must be a SHA512 hash of the passhprase.
 */
exports.DLDB_INCOMING_SECRET = (_h = (_g = process === null || process === void 0 ? void 0 : process.env) === null || _g === void 0 ? void 0 : _g.DLDB_INCOMING_SECRET) !== null && _h !== void 0 ? _h : '';
/**
 * Delay to wait until sending the data to remote node(s) in milliseconds.
 */
exports.DLDB_SEND_DELAY = parseInt((_k = (_j = process === null || process === void 0 ? void 0 : process.env) === null || _j === void 0 ? void 0 : _j.DLDB_SEND_DELAY) !== null && _k !== void 0 ? _k : '300', 10);