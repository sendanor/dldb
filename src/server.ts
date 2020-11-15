#!/usr/bin/env node

import {
    DLDB_HOSTNAME,
    DLDB_INCOMING_SECRET,
    DLDB_NODES,
    DLDB_PORT,
    DLDB_PUBLIC_URL,
    DLDB_SEND_DELAY
} from "./Environment";
import DLDBServer, {DLDBResponseStatus} from "./DLDBServer";

const HTTP = require('http');

const DLDB = new DLDBServer();

const SERVER = HTTP.createServer( DLDB.preProcessRequest.bind(DLDB) );

if (DLDB_NODES.length <= 0) {

    console.error(
        'ERROR: We do not have configured nodes to send data. Data cannot persist.\n\n'
        +'Please configure using DLDB_NODES environment variable.'
    );

} else {

    SERVER.listen(DLDB_PORT, DLDB_HOSTNAME, () => {

        console.log(`DLDB node running at ${DLDB_PUBLIC_URL} using nodes: ${ DLDB_NODES.join(' ') }`);

    });

}

let CLOSING_STATE = false;

function closeProcess () {

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
