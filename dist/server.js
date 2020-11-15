#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var Environment_1 = require("./Environment");
var DLDBServer_1 = require("./DLDBServer");
var HTTP = require('http');
var DLDB = new DLDBServer_1["default"]();
var SERVER = HTTP.createServer(DLDB.preProcessRequest.bind(DLDB));
if (Environment_1.DLDB_NODES.length <= 0) {
    console.error('ERROR: We do not have configured nodes to send data. Data cannot persist.\n\n'
        + 'Please configure using DLDB_NODES environment variable.');
}
else {
    SERVER.listen(Environment_1.DLDB_PORT, Environment_1.DLDB_HOSTNAME, function () {
        console.log("DLDB node running at " + Environment_1.DLDB_PUBLIC_URL + " using nodes: " + Environment_1.DLDB_NODES.join(' '));
    });
}
var CLOSING_STATE = false;
function closeProcess() {
    if (CLOSING_STATE === false) {
        console.info('DLDB node shutdown requested.');
        CLOSING_STATE = true;
    }
    SERVER.close();
}
process.on('exit', closeProcess);
process.on('SIGTERM', closeProcess);
process.on('SIGINT', closeProcess);
process.on('SIGUSR1', closeProcess);
process.on('SIGUSR2', closeProcess);
process.on('uncaughtException', closeProcess);
