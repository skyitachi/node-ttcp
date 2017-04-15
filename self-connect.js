#!/usr/bin/env node

const net = require("net");

let count = 1000;

function sleep(seconds) {
    const st = Date.now();
    while(Date.now() - st < seconds * 1000);
}

function self_connect(socket, port) {
  if (count > 0) {
    socket.connect({
      port: port
    }, function () {
      console.log("Connected: ", socket.address, socket.remoteAddress)
      sleep(60 * 60);
    });
  }
}
if (process.argv.length < 3) {
  console.log("Usage: %s port", process.argv[1]);
} else {
  const socket = new net.Socket();
  socket.setMaxListeners(1024);
  socket.on("error", function () {
    count -= 1;
    self_connect(socket, process.argv[2]);
  });
  self_connect(socket, process.argv[2]);
}