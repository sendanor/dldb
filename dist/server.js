#!/usr/bin/env node
"use strict";
exports.__esModule = true;
var Environment_1 = require("./Environment");
var DLDBServer_1 = require("./DLDBServer");
var HTTP = require('http');
if (!Environment_1.DLDB_REQUEST_SECRET) {
    console.error('ERROR: You need to configure DLDB_REQUEST_SECRET.\n\n'
        + 'Please configure using DLDB_REQUEST_SECRET environment variable.');
    process.exit(1);
}
else {
    var CLOSING_STATE_1 = false;
    var DLDB_1 = new DLDBServer_1["default"]();
    var SERVER_1 = HTTP.createServer(DLDB_1.preProcessRequest.bind(DLDB_1));
    var closeProcess = function () {
        if (CLOSING_STATE_1 === false) {
            console.info('DLDB node shutdown requested.');
            CLOSING_STATE_1 = true;
        }
        DLDB_1.close();
        SERVER_1.close();
    };
    if (Environment_1.DLDB_NODES.length <= 0) {
        console.error('ERROR: We do not have configured nodes to send data. Data cannot persist.\n\n'
            + 'Please configure using DLDB_NODES environment variable.');
        process.exit(1);
    }
    else {
        SERVER_1.listen(Environment_1.DLDB_PORT, Environment_1.DLDB_HOSTNAME, function () {
            console.log("DLDB node running at " + Environment_1.DLDB_PUBLIC_URL + " using nodes: " + Environment_1.DLDB_NODES.join(' '));
        });
    }
    process.on('exit', closeProcess);
    process.on('SIGTERM', closeProcess);
    process.on('SIGINT', closeProcess);
    process.on('SIGUSR1', closeProcess);
    process.on('SIGUSR2', closeProcess);
    process.on('uncaughtException', closeProcess);
}
