# dldb

This is a proof of concept REST backend for a cloud based [Delay Line Memory](https://en.wikipedia.org/wiki/Delay_line_memory) database.

This database is like a memory database, but instead of memory, it transmits the data to another node over the network 
in an infinite loop and does not save the data locally. 

Essentially the data is in the network data stream between the nodes.

It...

 * does not save state of data anywhere on the computer running the node
 * When there are no nodes waiting for data, automatically selects the slowest link on average
 * In case of a shutdown of a single node, it tries to make sure all active requests have been served (eg. the data is on another node)
 * Can notify other nodes about a desire to read or write data

### Installing the backend 

The bundled compiled backend does not have installable dependencies except Node v14 LTS and NPM command.

Clone it from Github using `git clone https://github.com/sendanor/dldb.git dldb` and start the node using command `npm start`.

...or install it from the NPM: `npm install dldb` and start the node using `dldbd` command.

### Building the node backend

Building is not strictly necessary, since the git repository includes already compiled dist directory.

```
$ npm install
$ npm run build
```

### Generate a secret

```
$ echo -n 'Secret1234'|shasum -a 512
9006d55d6e812ca3cf599dd70bf7142bddc4077553caafc505cb609edbc6e48bd86acf76b52e5903a125950dfedd70c32144bd59adcd798f3a504dc3c7bc37e9  -
```

### Start nodes

Start the first node:

```
$ DLDB_INCOMING_SECRET='9006d55d6e812ca3cf599dd70bf7142bddc4077553caafc505cb609edbc6e48bd86acf76b52e5903a125950dfedd70c32144bd59adcd798f3a504dc3c7bc37e9' \
DLDB_PORT=3000 \
DLDB_NODES='http://localhost:3001' \
npm start
```

Start the second node: 

```
$ DLDB_INCOMING_SECRET='9006d55d6e812ca3cf599dd70bf7142bddc4077553caafc505cb609edbc6e48bd86acf76b52e5903a125950dfedd70c32144bd59adcd798f3a504dc3c7bc37e9' \
DLDB_PORT=3001 \
DLDB_NODES='http://localhost:3000' \
npm start
```

### Start database loop

```
$ curl -i -X POST 'http://localhost:3000/d/74766E7B-D41A-4A95-8C01-A28213B0C84A' -d '{"secret": "Secret1234", "payload":{"hello":"world"}}'
HTTP/1.1 200 OK
Content-Type: application/json
Date: Sat, 14 Nov 2020 21:17:05 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 20

{
  "status": "OK"
}
```

### Read database record

```
$ curl -i -X GET http://localhost:3000/74766E7B-D41A-4A95-8C01-A28213B0C84A
HTTP/1.1 200 OK
Content-Type: application/json
Date: Sat, 14 Nov 2020 21:17:58 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 43

{
  "payload": {
    "hello": "world"
  }
}
```

### Change the record

```
$ curl -i -X POST -d '{"foo":1234}' http://localhost:3000/74766E7B-D41A-4A95-8C01-A28213B0C84A
HTTP/1.1 200 OK
Content-Type: application/json
Date: Sat, 14 Nov 2020 21:18:37 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 60

{
  "payload": {
    "hello": "world",
    "foo": 1234
  }
}
```

### The public hostname (`DLDB_PUBLIC_HOST`)

The address which other nodes can use to connect to this node.

This is `localhost:{DLDB_PORT}` by default.

### The public URL (`DLDB_PUBLIC_URL`)

The public URL which other nodes can use to connect to this node.

This is `http://{DLDB_PUBLIC_HOST}` by default.

### The default listening hostname (`DLDB_HOSTNAME`)

The default listening hostname is `0.0.0.0`, eg. every interface on the system.

### The default listening port (`DLDB_PORT`)

Default port is `3000` and can be changed using `DLDB_PORT` environment variable.

### Changing the node delay (`DLDB_SEND_DELAY`)

If no nodes have requested data, by default the operating node will wait for a 300 ms until sending the data to another
node, so that you don't accidentally nuke your system.

You may change the delay by changing `DLDB_SEND_DELAY` environment variable.
