var express = require('express');
var app = express();

//var server = require('http').createServer(app);
//var io = require('socket.io').listen(server);

var server = require('http').Server(app);
var io = require('socket.io')(server);

//For oauth lohin
var socketioJwt = require('socketio-jwt');
//var dotenv = require('dotenv');
//var dotenv = require('dotenv').config({silent: true});

//dotenv.load();

var env = {
  AUTH0_CLIENT_ID: "MQfFzb9Fe8SHb985tWDsqk82MLvU6aUN",
  AUTH0_DOMAIN: "Iz2SGfUsmzMoxu2W9ESNgNJ1mUpLNazDdKqr-7IkBBDBK2GYRIGNaaXcTVoCbiHU",
}

var userList = {};
//var players = {};
var availablePlayers = {};
//var availablePlayers = new HashMap();


rooms = {};
timer = {};
quesTimer = {};

var crickDB = require('./crickDB');
//var mongoUrl = "mongodb://nodejitsu:a0f0747f0b274f3f64db4794a4b40308@troup.mongohq.com:10068/nodejitsudb7928049017"; 
var mongoUrl = "mongodb://kay:kay@ds061375.mongolab.com:61375/crickquiz_db"

if(process.env.SUBDOMAIN){
  url = 'http://' + process.env.SUBDOMAIN + '.jit.su/';
}

crickDB.connect(mongoUrl, function(){
  console.log('Connected to mongo at: ' + mongoUrl);
	  server.listen(process.env.PORT || 5000,function(){
	  console.log("Listening to port 5000 " + process.env.PORT );
	});
}); 

app.get('/',function(req,res){
	res.sendfile(__dirname + '/index.html'); 
	});
app.use(express.static(__dirname));	

	
io
.on('connection', socketioJwt.authorize({
		secret: Buffer(JSON.stringify('Iz2SGfUsmzMoxu2W9ESNgNJ1mUpLNazDdKqr-7IkBBDBK2GYRIGNaaXcTVoCbiHU'), 'base64'),
		timeout: 15000 // 15 seconds to send the authentication message
	}))

	.on('authenticated',function(socket){
	// STEP 2 - Receives the client's Data and Emit it to all Users
	console.log('connected & authenticated: ' + JSON.stringify(socket.decoded_token));
	socket.on('new user',function(data){
		console.log("Inside SERVER : new user :::: " + socket);
		crickDB.adduser(data,socket.decoded_token);
		var userdata = {
		user_id : data.user_id,
		name : data.nickname,
		picture : data.picture
		}
		socket.username = data.nickname;
		socket.user_id = data.user_id;
		socket.userdata = userdata;
		//userList[socket.username] = socket; 
		userList[socket.user_id] = socket;

		//availablePlayers[socket.username] = socket; 
		availablePlayers[socket.user_id] = socket; 
		updateAvailablePlayers();
	});
	

	function updateAvailablePlayers(){
		console.log("---------------------availablePlayers------------------------------------");
		var userArray = [];
		for(key in availablePlayers){
			var value = availablePlayers[key];
			var udata = value.userdata;
			userArray.push(udata);
		}
		console.log(userArray);		
		io.sockets.emit('available players',userArray); 
		//io.sockets.emit('available players',Object.keys(availablePlayers)); 
	}
	socket.on('disconnect' , function(data){
		if(!socket.user_id) return;
		// code to remove user from list
		delete userList[socket.user_id];
		delete availablePlayers[socket.user_id];
		updateAvailablePlayers();
	});
	
	socket.on('challenge',function(data){		// we receive user_id from client
		var test = userList[socket.user_id].userdata;
		userList[data].emit('challenge raised',test);			// we send userdata object to client
		//userList[data].emit('challenge raised',socket.userdata.name);
	});
	
	socket.on('new game',function(data){			// we receive user_id from client

		var round = 0;
		var score = 0;
		var quesData = {};
		var clicked = 0;
		//console.log(" INSIDE SERVER new game : Emit newQuesData ");
		//console.log("socket.username - PLAYER 1: %s",socket.username);
		//console.log("Challenged user Player 2 :%s",data);
		
		//var player1Socket = userList[socket.username];
		var player1Socket = userList[socket.user_id];
		var player2Socket = userList[data];
		
		// Remove from availablePlayers list
		delete availablePlayers[data];
		delete availablePlayers[socket.user_id];
		updateAvailablePlayers();
		 
		var player1 = {
			name : socket.userdata.name,
			pic : socket.userdata.picture,
			user_id : socket.userdata.user_id,
			socketID : player1Socket.id,
			score : score,
			clicked : clicked
			}
		var player2 = {
			name : player2Socket.userdata.name,
			pic : player2Socket.userdata.picture,
			user_id : player2Socket.userdata.user_id,
			socketID : player2Socket.id,
			score : score,
			clicked : clicked
			}
						
		var randomNo = ( Math.random() * 100000 ) | 0;    // create a random number for Game room
		var thisGameId  = randomNo.toString();
		player1Socket.join(thisGameId);
		player2Socket.join(thisGameId);
		// Getting data from Mongo DB
		crickDB.getQuesSet(function(error, bank){
		 	if(error)
		 		console.log(error);
		 	else{
				console.log("Inside  crickDB.getQuesSet -  app.js");
				console.log(bank);
				var data = {
					gameId : thisGameId,
					player1 : player1,
					player2 : player2,
					round : round,
					quesBank : bank,
					quesData : quesData
   				 };
   				rooms[thisGameId] = data;
				startGame(data);
			}
	});
	});
	socket.on('start timer' , function(gameId){
		console.log(" INSIDE SERVER START TIMER ");
		countDown(10,gameId);
	});
	
	socket.on('update score' , function(data){
		rooms[data.gameId] = data;
		console.log(" INSIDE SERVER update score : Emit display score ");
		io.sockets.in(data.gameId).emit('display score', data);
	});
	
	socket.on('update click' , function(data){
		rooms[data.gameId] = data;
		console.log(" INSIDE SERVER update score : Emit update click ");
		if((data.player1.clicked == 1) && (data.player2.clicked == 1)){
			console.log(" INSIDE SERVER update score : Emit update click : BOTH USER");
			clearInterval(timer[data.gameId]);
			clearInterval(quesTimer[data.gameId]);
			startGame(rooms[data.gameId]);
		}
		else
			io.sockets.in(data.gameId).emit('store data', rooms[data.gameId]);
	});
	
	function startGame(data){
		sendWord(rooms[data.gameId]);
		if(timer[data.gameId])
			clearInterval(timer[data.gameId]);
			
		clearInterval(quesTimer[data.gameId]);
		timer[data.gameId] = setInterval(function() {
			console.log(" SERVER : TIMER SENDWORD");
			sendWord(rooms[data.gameId]);						// Sending the data stored in Global Rooms Object
  		}, 10000);
}
function sendWord(data){
	console.log(" SERVER : INSIDE SEND WORD FUNCTION ");
	console.log("TIMER : ");
	console.log(data);
	console.log(timer[data.gameId]);
	data.round = data.round + 1;
	rooms[data.gameId] = data;
	if(data.round > 5){
		clearInterval(timer[data.gameId]);
		return;
	}
	if(data.round == 5){
  		clearInterval(timer[data.gameId]);
  		console.log("*************************************ROOMS********************************");
   		console.log(rooms);
  		console.log("SERVER : INSIDE next round : emit Final Screen");
  		var gamedata = {
					gameId : data.gameId,
					player1 : data.player1,
					player2 : data.player2
   				 };
  		crickDB.savegame(data.player1.name,gamedata);
  		crickDB.savegame(data.player2.name,gamedata);
		io.sockets.in(data.gameId).emit('final score', data);
		return;
	}
	if(data.round < 5){
    data.quesData = getquesData(data);
    console.log("QUESTION SENT TO CLIENT : emit newQuesData");
//	setTimeout(function() {
    	io.sockets.in(data.gameId).emit('newQuesData', data);
  //  }, 5000 );
    }
    
}

function getquesData(data){
	//console.log(":::::::::::  QUESDATA ::::::::::::");
	console.log(data.round);
	var questionBank = data.quesBank;
	var numberOfOptions=questionBank[data.round-1].length-1;
	var answerIndex =0;
	var answer;
	answerArray=[];
	for(i=0;i<numberOfOptions;i++){
		answerArray[i]=questionBank[data.round-1][i+1];
	}
	answer = answerArray[0];
	answerIndex = scramble(answerArray,answerIndex);
    // Package the words into a single object.
    var quesData = {
        question : questionBank[data.round-1][0],   // Displayed Word
        answerIndex : answerIndex, // Correct Answer Index
        answer : answer,
        options : answerArray      // Shuffled options
    };
    return quesData;
} //getquesData


function scramble(scrambleArray){
	//console.log("Inside scramble Function");
	var answerRef = scrambleArray[0];
	var temp="";var rnd2=0;var rnd3=0;
	var answerIndex = 0;
	for(var i=0;i<30;i++){
		rnd2=Math.floor(Math.random()*scrambleArray.length);
		rnd3=Math.floor(Math.random()*scrambleArray.length);
		temp=scrambleArray[rnd3];
		scrambleArray[rnd3]=scrambleArray[rnd2];
		scrambleArray[rnd2]=temp;
	}

	for(i=0;i<scrambleArray.length;i++){
		if(scrambleArray[i]==answerRef){
			answerIndex=i+1;
		}
	}
	//console.log("answerIndex " + answerIndex);
	return answerIndex;
}//scramble

function countDown(startTime,gameId) {
			if(quesTimer[gameId])
				clearInterval(quesTimer[gameId]);
			io.sockets.in(gameId).emit('show countdown', startTime);
			//io.sockets.emit('show countdown', startTime);
          	quesTimer[gameId] = setInterval(countItDown,1000);
            // Decrement the displayed timer value on each 'tick'
            function countItDown(){
               startTime -= 1;
                io.sockets.in(gameId).emit('show countdown', startTime);
              //io.sockets.emit('show countdown', startTime);
                if( startTime <= 1 ){
                    console.log('Countdown Finished.');
                    console.log(quesTimer[gameId]);
                    // Stop the timer and do the callback.
                    clearInterval(quesTimer[gameId]);
                    return;
                }
            }
         }
	
});


