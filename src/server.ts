#!/usr/bin/env node

import {
    DLDB_HOSTNAME,
    DLDB_NODES,
    DLDB_PORT,
    DLDB_PUBLIC_URL, DLDB_REQUEST_SECRET
} from "./Environment";

import DLDBServer from "./DLDBServer";

const HTTP = require('http');

if (!DLDB_REQUEST_SECRET) {

    console.error(
        'ERROR: You need to configure DLDB_REQUEST_SECRET.\n\n'
        +'Please configure using DLDB_REQUEST_SECRET environment variable.'
    );

    process.exit(1);

} else {

    let CLOSING_STATE = false;

    const DLDB = new DLDBServer();

    const SERVER = HTTP.createServer( DLDB.preProcessRequest.bind(DLDB) );

    const closeProcess = () => {

        if (CLOSING_STATE === false) {

            console.info('DLDB node shutdown requested.');

            CLOSING_STATE = true;

        }

        DLDB.close();

        SERVER.close();

    };

    if (DLDB_NODES.length <= 0) {

        console.error(
            'ERROR: We do not have configured nodes to send data. Data cannot persist.\n\n'
            +'Please configure using DLDB_NODES environment variable.'
        );

        process.exit(1);

    } else {

        SERVER.listen(DLDB_PORT, DLDB_HOSTNAME, () => {

            console.log(`DLDB node running at ${DLDB_PUBLIC_URL} using nodes: ${ DLDB_NODES.join(' ') }`);

        });

    }

    process.on('exit', closeProcess);
    process.on('SIGTERM', closeProcess);
    process.on('SIGINT', closeProcess);
    process.on('SIGUSR1', closeProcess);
    process.on('SIGUSR2', closeProcess);
    process.on('uncaughtException', closeProcess);

}

