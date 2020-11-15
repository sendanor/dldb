import StringUtils from "./StringUtils";

/**
 * Local DLDB node hostname where to listen connections
 */
export const DLDB_HOSTNAME : string                    = process?.env?.DLDB_HOSTNAME ?? '0.0.0.0';

/**
 * Local DLDB node port where to listen connections
 */
export const DLDB_PORT     : number                    = parseInt(process?.env?.DLDB_PORT ?? '3000', 10);

/**
 * Other remote nodes.
 */
export const DLDB_NODES    : Array<string> | undefined = (process?.env?.DLDB_NODES ?? '').split(' ').map(StringUtils.trim).filter(StringUtils.notEmpty);

/**
 * Secret which you must know to send the first incoming data packet.
 *
 * This must be a SHA512 hash of the passhprase.
 */
export const DLDB_INCOMING_SECRET : string = process?.env?.DLDB_INCOMING_SECRET ?? '';

/**
 * The minimum network delay in ms to take into account when choosing where to send a package.
 *
 * If it is less than this value, the destination will be random.
 */
export const DLDB_MINIMUM_NETWORK_DELAY : number = parseInt(process?.env?.DLDB_MINIMUM_NETWORK_DELAY ?? '1', 10);

/**
 * Delay to wait until sending the data to remote node(s) in milliseconds.
 */
export const DLDB_SEND_DELAY : number = parseInt(process?.env?.DLDB_SEND_DELAY ?? '300', 10);

/**
 * Public host for local DLDB node, eg. hostname[:port] and defaults to localhost:{DLDB_PORT}
 */
export const DLDB_PUBLIC_HOST : string               = process?.env?.DLDB_PUBLIC_HOST ?? `localhost:${DLDB_PORT}`;

/**
 * Public URL for local DLDB node, eg. http://hostname[:port] and defaults to http://{DLDB_PUBLIC_HOST}
 */
export const DLDB_PUBLIC_URL : string                = process?.env?.DLDB_PUBLIC_URL ?? `http://${DLDB_PUBLIC_HOST}`;
