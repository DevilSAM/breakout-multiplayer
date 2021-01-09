var express = require('express')
  , app = express(app)
  , server = require('http').createServer(app);

// serve static files from the current directory
app.use(express.static(__dirname));

//we'll keep clients data here
var clients = {};

// Попрбую тут хранить пле кирпичей
var totalField = {}
for (let i = 0; i < 60; i++) {
    totalField[i] = {x: -1, y: -1}
}
const initBricks = () => {
  // инициализируем 112,100 => (10 / 6) (64 / 32)
  let idx = 0
  for (let i = 100; i < 261; i += 32) {
      for (let j = 112; j < 689; j += 64) {
          totalField[idx]['x'] = j
          totalField[idx]['y'] = i
          idx++
      }
  }
}
initBricks()




//get EurecaServer class
var Eureca = require('eureca.io');

//create an instance of EurecaServer
var eurecaServer = new Eureca.Server({allow:['setId', 'updateState', 'newPlayer', 'updateBricksState', 'enableAllBricks', 'checkBrokenBricks']});

eurecaServer.attach(server);




//eureca.io provides events to detect clients connect/disconnect

//detect client connection
eurecaServer.onConnect(function (conn) {
    console.log('New Client id=%s ', conn.id, conn.remoteAddress);

    //the getClient method provide a proxy allowing us to call remote client functions
    var remote = eurecaServer.getClient(conn.id);

    //register the client
    clients[conn.id] = {id:conn.id, remote:remote}
    console.log('CLIENTS is:')
    console.log(clients)
  
    //here we call setId (defined in the client side)
    remote.setId(conn.id);
});

//detect client disconnection
eurecaServer.onDisconnect(function (conn) {
    console.log('Client disconnected ', conn.id);
    var removeId = clients[conn.id].id;
    // удаляем id из списка клиентов
    delete clients[conn.id];
    for (var c in clients) {
      var remote = clients[c].remote;
    }
    console.log(clients)
});

eurecaServer.exports.handshake = function() {
  for (var c in clients) {
    var remote = clients[c].remote;
    for (var cc in clients) {
      //send latest known position
      var ballX = clients[cc].laststate ? clients[cc].laststate.ball.x : 0;
      var ballY = clients[cc].laststate ? clients[cc].laststate.ball.y : 0;
      var paddleX = clients[cc].laststate ? clients[cc].laststate.paddle.x : 0;
      var paddleY = clients[cc].laststate ? clients[cc].laststate.paddle.y : 0;

      remote.newPlayer(clients[cc].id, ballX, ballY, paddleX, paddleY);
      console.log(`НОВЫЙ ИГРОК:   ${clients[cc].id}`)
    }
  }
}

eurecaServer.exports.compareBricks = function (i, x, y) {
    for (var c in clients) {
        var remote = clients[c].remote
        remote.checkBrokenBricks(i, x, y)
    }
}

// be exposed to client side
eurecaServer.exports.handleKeys = function (objectUsersList) {
    var conn = this.connection;
    var updatedClient = clients[conn.id];
    
    for (var c in clients) {
        var remote = clients[c].remote;
        remote.updateState(updatedClient.id, objectUsersList);

        //keep last known state so we can send it to new connected clients
        clients[c].laststate = objectUsersList;
    }
}

eurecaServer.exports.updateBricks = function (brckIdx, brckX, brckY) {
    totalField[brckIdx]['x'] = -1
    totalField[brckIdx]['y'] = -1

    for (var c in clients) {
        var remote = clients[c].remote
        remote.updateBricksState(brckIdx, brckX, brckY);
    }
}

eurecaServer.exports.renewAllBricks = function () {
  initBricks()
  for (var c in clients) {
      var remote = clients[c].remote
      remote.enableAllBricks();
  }
}

eurecaServer.exports.getField = function () {
    return totalField;
}





server.listen(8000);