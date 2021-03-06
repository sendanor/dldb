"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
exports.__esModule = true;
exports.DLDB_PUBLIC_URL = exports.DLDB_PUBLIC_HOST = exports.DLDB_SEND_DELAY = exports.DLDB_MINIMUM_NETWORK_DELAY = exports.DLDB_REQUEST_SECRET = exports.DLDB_INCOMING_SECRET = exports.DLDB_NODES = exports.DLDB_PORT = exports.DLDB_HOSTNAME = void 0;
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
 * Secret which you must know to direct traffic to nodes.
 */
exports.DLDB_REQUEST_SECRET = (_k = (_j = process === null || process === void 0 ? void 0 : process.env) === null || _j === void 0 ? void 0 : _j.DLDB_REQUEST_SECRET) !== null && _k !== void 0 ? _k : '';
/**
 * The minimum network delay in ms to take into account when choosing where to send a package.
 *
 * If it is less than this value, the destination will be random.
 */
exports.DLDB_MINIMUM_NETWORK_DELAY = parseInt((_m = (_l = process === null || process === void 0 ? void 0 : process.env) === null || _l === void 0 ? void 0 : _l.DLDB_MINIMUM_NETWORK_DELAY) !== null && _m !== void 0 ? _m : '1', 10);
/**
 * Delay to wait until sending the data to remote node(s) in milliseconds.
 */
exports.DLDB_SEND_DELAY = parseInt((_p = (_o = process === null || process === void 0 ? void 0 : process.env) === null || _o === void 0 ? void 0 : _o.DLDB_SEND_DELAY) !== null && _p !== void 0 ? _p : '300', 10);
/**
 * Public host for local DLDB node, eg. hostname[:port] and defaults to localhost:{DLDB_PORT}
 */
exports.DLDB_PUBLIC_HOST = (_r = (_q = process === null || process === void 0 ? void 0 : process.env) === null || _q === void 0 ? void 0 : _q.DLDB_PUBLIC_HOST) !== null && _r !== void 0 ? _r : "localhost:" + exports.DLDB_PORT;
/**
 * Public URL for local DLDB node, eg. http://hostname[:port] and defaults to http://{DLDB_PUBLIC_HOST}
 */
exports.DLDB_PUBLIC_URL = (_t = (_s = process === null || process === void 0 ? void 0 : process.env) === null || _s === void 0 ? void 0 : _s.DLDB_PUBLIC_URL) !== null && _t !== void 0 ? _t : "http://" + exports.DLDB_PUBLIC_HOST;
