const net = require("net");
const SessionMessage = {
  num: 1024,
  length: 8192
};
const server = net.createServer(function (socket) {
  // socket.setEncoding("utf8");
  socket.on("data", function (buf) {
    console.log(buf);
  });
  socket.end("in the server");
}).on("error", function (err) {
  console.log(err);
});

server.listen({
  port: 12345
}, function () {
  console.log("listening");
});
