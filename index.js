#!/usr/bin/env node
const net = require("net");
const program = require("commander");
const assert = require("assert");
let server = null;
program
.version("0.0.1")
.option("-r, --server", "start ttcp server")
.option("-c, --client", "start ttcp client")
.option("-d, --host <value>", "ttcp server host")
.option("-p, --port <n>", "port number", parseInt)
.option("-n, --number <n>", "send count", parseInt)
.option("-l, --length <n>", "payload size", parseInt);

program.parse(process.argv);

let isServer = !program.client;
let host = program.host || "localhost";
let port = program.port || 10001;
let number = program.number || 1024;
let length = program.length || 4096;

function unpackSessionMessage(bigEndianBuf) {
  if (bigEndianBuf.length != 8) {
    return {};
  }
  return {
    number: bigEndianBuf.readInt32BE(0),
    length: bigEndianBuf.readInt32BE(4)
  };
}

function respond(socket) {
  let gotSessionMsg = false;
  let data = [];
  let sessionMsg = {};
  let payLoad = 0;
  let iteration = 0;
  let totalPayload = 0;
  let start = Date.now();
  socket.on("data", function (buf) {
    if (!gotSessionMsg) {
      if (buf.buffer.byteLength >= 8) {
        gotSessionMsg = true;
        // big-endian
        sessionMsg = unpackSessionMessage(Buffer.from(buf.buffer.slice(0, 8)));
        payLoad += buf.buffer.byteLength - 8;
        totalPayload = sessionMsg.length + 4;
      }
    } else {
      payLoad += buf.buffer.byteLength;
    }

    if (payLoad >= totalPayload) {
      payLoad -= totalPayload;
      iteration += 1;
      buf = Buffer.from(new ArrayBuffer(4));
      buf.writeInt32BE(sessionMsg.length, 0);
      socket.write(buf);
      if (iteration === sessionMsg.number) {
        const received = 8 + sessionMsg.number * (sessionMsg.length + 4);
        const elapsed = (Date.now() - start) / 1000;
        const size = Math.floor(received / 1024 / 1024);
        console.log(`received size: ${size}MB`);
        console.log(`rate is ${(size / elapsed).toFixed(3)} MB/s`);
        server.close();
      }
    }
  });
}

function transmit(socket) {
  // send session message
  let start = Date.now();
  let remain = number;
  let buffer = Buffer.from(new ArrayBuffer(8));
  buffer.writeInt32BE(number, 0);
  buffer.writeInt32BE(length, 4);
  socket.write(buffer);

  // send first payload
  buffer = Buffer.allocUnsafe(length + 4);
  buffer.fill(0);
  buffer.writeInt32BE(length, 0);
  socket.write(buffer);
  remain -= 1;

  socket.on("data", function (buf) {
    const l = buf.readInt32BE(0);
    assert(l === length, "client did not receive right ack");
    if (remain) {
      buffer = Buffer.allocUnsafe(length + 4);
      buffer.fill(0);
      buffer.writeInt32BE(length, 0);
      socket.write(buffer);
      remain -= 1;
    } else {
      const received = 8 + number * (length + 4);
      const elapsed = (Date.now() - start) / 1000;
      const size = Math.floor(received / 1024 / 1024);
      console.log(`send size: ${size}MB`);
      console.log(`rate is ${(size / elapsed).toFixed(3)} MB/s`);
      socket.end();
    }
  });
}

if (isServer) {
  server = net
    .createServer(respond)
    .on("error", function (err) {
      console.log(err);
      server.close();
    });

  server.listen({
    port: port
  }, function () {
    console.log(`${host} is listening on port : ${port}`);
  });

  process.on("exit", function () {
    server.close();
  });
} else {
  const socket = new net.Socket({ readable: true, writable: true });
  socket.connect({
    port: port,
    host: host
  }, function () {
    console.log("connection is established!!!");
    transmit(socket);
  });
}

