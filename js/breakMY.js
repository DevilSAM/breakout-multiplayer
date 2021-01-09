var myId = 0;
var usersList = {};
var fieldBricks = {}
var ready = false;
var eurecaServer;


// this function will handle client communication with the server
var eurecaClientSetup = function() {

    console.log('eurecaClientSetup')

    //create an instance of eureca.io client
    var eurecaClient = new Eureca.Client();

    // когда клиент готов
    eurecaClient.ready(function (proxy) {
        eurecaServer = proxy;
    });

    //methods defined under "exports" namespace become available in the server side
    eurecaClient.exports.setId = function(id) {
        console.log('CLIENT IS READY')
        //create() is moved here to make sure nothing is created before uniq id assignation
        myId = id;
        create.apply(game);
        console.log('ONE')
        eurecaServer.handshake();

        eurecaServer.getField().onReady(function (res) {
            fieldBricks = res;
            for (let idx in fieldBricks) {
                if (fieldBricks[idx]['x'] < 0) {
                    game.bricks.children.entries[idx].disableBody(true, true)
                }
            }
        })

        ready = true;
    }

    eurecaClient.exports.checkBrokenBricks = function (i, x, y) {

    }

    eurecaClient.exports.updateState = function(id, state) {

        if (usersList[id])  {
            usersList[id]['paddle']['x'] = state['paddle']['x']
            usersList[id]['ball']['x'] = state['ball']['x']
            usersList[id]['ball']['y'] = state['ball']['y']
        }

    }

    // удаление конкретного кирпичика у всех клиентов
    eurecaClient.exports.updateBricksState = function (brckIdx, brckX, brckY) {
        fieldBricks[brckIdx].x = -1
        fieldBricks[brckIdx].y = -1
        game.bricks.children.entries[brckIdx].disableBody(true, true)
    }

    // обновим поле для всех клиентов после победы
    eurecaClient.exports.enableAllBricks = function () {
        for (let i in game.bricks.children.entries) {
            game.bricks.children.entries[i].enableBody(false, 0, 0, true, true)
            fieldBricks[i]['x'] = game.bricks.children.entries[i]['x']
            fieldBricks[i]['y'] = game.bricks.children.entries[i]['y']
        }
    }

    eurecaClient.exports.newPlayer = function(i, ballX, ballY, paddleX, paddleY) {
        
        if (i == myId) {
            console.log(`this is my ID: ${myId}. So RETURN`)
            return; //this is me
        }

        var ball = {'x': ballX, 'y': ballY}
        var paddle = {'x': paddleX, 'y': paddleY}
        
        usersList[i] = {}
        usersList[i]['ball'] = ball
        usersList[i]['paddle'] = paddle

        // console.log(`SPAWN new player ${i}`);
        // // making a new paddle
        // let paddleName = 'paddleID'
        // game[paddleName] = new Paddle (400, 550);
        // game[paddleName] = game.scene.scenes[0].physics.add.image(game[paddleName].x, game[paddleName].y, 'assets', 'paddle2').setImmovable();
        // console.log('NEW paddle successfully drawn!')

    }

}


//eurecaClientSetup();


var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: {
        preload: preload,
        create: eurecaClientSetup,
        update: update,
        render: render
    },
    physics: {
        default: 'arcade'
    }
}

var game = new Phaser.Game(config);

function preload () {
    console.log('PREload')
    this.load.atlas('assets', 'assets/breakout.png', 'assets/breakout.json');
}

class Ball {
    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
}

class Paddle {
    constructor (x, y) {
        this.x = x;
        this.y = y;
    }
}

class Bricks {
    constructor (cnt) {
        this.bricks = {}
        for (let i = 0; i < cnt; i++) {
            this.bricks[i] = {}
            this.bricks[i]['x'] = 0;
            this.bricks[i]['y'] = 0;
        }
    }
}



function create () {

    console.log('start CREATE')

    //  Enable world bounds, but disable the floor
    this.scene.scenes[0].physics.world.setBoundsCollision(true, true, true, false);

    // making bricks
    this.bricks = new Bricks(60);
    this.bricks = game.scene.scenes[0].physics.add.staticGroup({
        key: 'assets', frame: [ 'blue1', 'red1', 'green1', 'yellow1', 'silver1', 'purple1' ],
        frameQuantity: 10, // количество блоков
        gridAlign: { width: 10, height: 6, cellWidth: 64, cellHeight: 32, x: 112, y: 100 }
        /* столбцы блоков, строки блоков, ширина ячейки, выста ячейки, отступ слева, отступ сверху */
    });
    console.log('bricks successfully drawn!')
    // присвоим в класс Bricks значения
    console.log(this.bricks)

    // making a ball
    this.ball = new Ball(400, 525);
    this.ball = this.scene.scenes[0].physics.add.image(this.ball.x, this.ball.y, 'assets', 'ball1').setCollideWorldBounds(true).setBounce(1);
    this.ball.setData('onPaddle', true);
    console.log('ball successfully drawn!')

    // making a paddle
    this.paddle = new Paddle (400, 550);
    this.paddle = this.scene.scenes[0].physics.add.image(this.paddle.x, this.paddle.y, 'assets', 'paddle1').setImmovable();
    console.log('paddle successfully drawn!')

    // creating colliders
    this.scene.scenes[0].physics.add.collider(this.ball, this.bricks, hitBrick, null, this);
    this.scene.scenes[0].physics.add.collider(this.ball, this.paddle, hitPaddle, null, this);
    console.log('Collider done!')

    // Управляем платформой при помощи курсора
    this.scene.scenes[0].input.on('pointermove', function (pointer) {
        //  Keep the paddle within the game
        this.paddle.x = Phaser.Math.Clamp(pointer.x, 52, 748);
        // если мячик на платформе, то двигаем его тоже
        if (this.ball.getData('onPaddle')) {
            this.ball.x = this.paddle.x;
        }
    }, this);
    console.log('Cursor events ready!')

    // запуск мячика при отпускании кнопки мыши
    this.scene.scenes[0].input.on('pointerup', function (pointer) {
        if (this.ball.getData('onPaddle')) {
            this.ball.setVelocity(-85, -700);
            this.ball.setData('onPaddle', false);
        }
    }, this);


    // заполним данные о пользователе, о позиции его мячика, платформы и кирпичах
    usersList[myId] = {}
    usersList[myId]['paddle'] = {}
    usersList[myId]['paddle']['x'] = this.paddle.x
    usersList[myId]['paddle']['y'] = this.paddle.y
    usersList[myId]['ball'] = {}
    usersList[myId]['ball']['x'] = this.ball.x
    usersList[myId]['ball']['y'] = this.ball.y
    if (Object.keys(usersList).length == 1) {
        for (let i = 0; i < 60; i++) {
            fieldBricks[i] = {}
            fieldBricks[i].x = this.bricks.children.entries[i].x
            fieldBricks[i].y = this.bricks.children.entries[i].y
        }
    }


    console.log('end CREATE. Now this =')
}

function update () {
    if (!ready) {
        console.log('NOT READY!   return')
        return
    }
    // зафиксируем изменения позиции мячика или платформы
    if ( (usersList[myId]['paddle']['x'] != this.game.paddle.x) || ( (usersList[myId]['ball']['x'] != this.game.ball.x) && (usersList[myId]['ball']['y'] != this.game.ball.y) ) ) {
        usersList[myId]['paddle']['x'] = this.game.paddle.x
        usersList[myId]['ball']['x'] = this.game.ball.x
        usersList[myId]['ball']['y'] != this.game.ball.y
        
        // и передадим новые значения серверу, для дальнейшей синхронизации
        eurecaServer.handleKeys(usersList[myId]);
    }

    // put the ball on the paddle if it was missed
    if (this.game.ball.y > 600) {
        console.log('RESET')
        resetBall(this.game)
    }
}

function render () {}


function resetBall (obj) {
    // obj === scene
    console.log('RESET BALL')
    obj.ball.setVelocity(0);
    obj.ball.setPosition(obj.paddle.x, 515);
    obj.ball.setData('onPaddle', true);
}

function resetLevel () {
    console.log('reset LEVEL')
    resetBall(this);
    this.bricks.children.each(function (brick) {
        brick.enableBody(false, 0, 0, true, true);
    });
    eurecaServer.renewAllBricks()
}

function hitBrick (ball, brick) {
    // удаляем блок
    brick.disableBody(true, true);

    for (let brckIdx in fieldBricks) {

        if( (fieldBricks[brckIdx]['x'] == brick.x) && (fieldBricks[brckIdx]['y'] == brick.y) ) {
            fieldBricks[brckIdx]['x'] = -1
            fieldBricks[brckIdx]['y'] = -1
            eurecaServer.updateBricks(brckIdx, brick.x, brick.y)
        }
    }
    // перезагружаем уровень, если блоки закончились
    if (this.bricks.countActive() === 0) {
        resetLevel.call(this);
        for (let i = 0; i < 60; i++) {
            fieldBricks[i] = {}
            fieldBricks[i].x = this.bricks.children.entries[i].x
            fieldBricks[i].y = this.bricks.children.entries[i].y
        }
    }
}

function hitPaddle (ball, paddle) {
    var diff = 0;
    if (ball.x < paddle.x) {
        //  Ball is on the left-hand side of the paddle
        diff = paddle.x - ball.x;
        ball.setVelocityX(-10 * diff);
    }
    else if (ball.x > paddle.x)  {
        //  Ball is on the right-hand side of the paddle
        diff = ball.x -paddle.x;
        ball.setVelocityX(10 * diff);
    } else {
        //  Ball is perfectly in the middle
        //  Add a little random X to stop it bouncing straight up!
        ball.setVelocityX(2 + Math.random() * 8);
    }
}

