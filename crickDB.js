var MongoClient = require('mongodb').MongoClient;
var db;
var connected = false;

module.exports = {
  connect: function(url, callback){
    MongoClient.connect(url, function(err, _db){
      if (err) { throw new Error('Could not connect: '+err); }
      
      db = _db;
      connected = true;
      
      callback(db);
    });
  },
  
  adduser: function(user,socket_decoded_token){
  var user_id = user.user_id;
  var userPrint = user.toString();
  console.log("Inside add user db :::::: " )
  console.log(user_id);
  console.log(user);
  console.log(userPrint);
  	var usercollection = db.collection('users');
  usercollection.findOne({ "userProfile.user_id" : user_id },function(err, result) {
    if (err) { console.log("Cannot fetch the user ::: " + err); }

    if (result) {
          console.log("USER Already exist");	
    } else {
        usercollection.save(
  		{
  			userProfile : user,
  			token		: socket_decoded_token,
  			games		: []
  		}
  	);
    }
	});
  },
  
savegame : function(name, gamedata){ // change name to user ID later
	var uname = name;
 // var user_id = user.user_id;
  //var userPrint = user.toString();
  console.log("Inside savegame db :::::: " )
  console.log(uname);
 console.log(gamedata);
  //console.log(userPrint);
  	var usercollection = db.collection('users');
  usercollection.findOne({ "userProfile.nickname" : uname },function(err, result) {
    if (err) { console.log("Cannot fetch the user ::: " + err); }

    if (result) {
          console.log("Inside PUSH");	
          result.games.push(gamedata);
          usercollection.save(result);
    } else {
        console.log("No user profile found to update games");
    }
    });
},
	
	/*usercollection.update(
  { "userProfile.user_id" : user_id }, // query
  {$set: {game : game}}, // replacement, replaces only the field "hi"
  {}, // options
  function(err, object) {
      if (err){
          console.warn(err.message);  // returns error if no matching object found
      }else{
          console.dir(object);
      }
  });
});

  },*/
  
  collection: function(name){
    if (!connected) {
      throw new Error('Must connect to Mongo before calling "collection"');
    }
    return db.collection(name);
  },
  
  
  findAll: function(callback){
    if (!connected) {
      throw new Error('Must connect to Mongo before calling "collection"');
    }
    else{
    	var coll = db.collection('inventory');
    	coll.find().toArray(function(error, results) {
          if( error ) 
          {
          	console.log("LOG 4");
          	console.log(error);
          	callback(error);
          }
          else 
          {
          	console.log("LOG 5");
          	console.log(results);
          	callback(null, results);
          }
        });
    	
    }
  },
  
    getQuesSet: function(callback){
    if (!connected) {
      throw new Error('Must connect to Mongo before calling "collection"');
    }
    else{
    
    	 var quesArray = db.collection('quesBank')
    				.find( { random_point : { $near : [Math.random(), 0] } } )
    				.limit( 5 )
    				.toArray(function(err, data) {
							if(err)
								console.log("Cannot fetch the set of 5 documents ::: " + err);
							else{
								console.dir(data);
								var questionBank = new Array();
								for (var i=0;i < data.length;i++) {
										console.log (data[i]);
										questionBank[i]=new Array;
										questionBank[i][0]=data[i].Question;
										if(data[i].Option1 != "None")
											questionBank[i][1]=data[i].Option1;
										if(data[i].Option2 != "None")
											questionBank[i][2]=data[i].Option2;
										if(data[i].Option3 != "None")
											questionBank[i][3]=data[i].Option3;
										if(data[i].Option4 != "None")
											questionBank[i][4]=data[i].Option4;	
								}
								console.log(questionBank);
								callback(null, questionBank);
							}
							
					});	
    	}
  	},

getQuesSet2: function(){
    if (!connected) {
      throw new Error('Must connect to Mongo before calling "collection"');
    }
    else{
    	 var quesArray = db.collection('quesBank')
    				.find( { random_point : { $near : [Math.random(), 0] } } )
    				.limit( 5 )
    				.toArray(function(err, data) {
							if(err)
								console.log("Cannot fetch the set of 5 documents ::: " + err);
							else{
								//console.dir(data);
								var questionBank = new Array();
								for (var i=0;i < data.length;i++) {
										console.log (data[i]);
										questionBank[i]=new Array;
										questionBank[i][0]=data[i].Question;
										if(data[i].Option1 != "None")
											questionBank[i][1]=data[i].Option1;
										if(data[i].Option2 != "None")
											questionBank[i][2]=data[i].Option2;
										if(data[i].Option3 != "None")
											questionBank[i][3]=data[i].Option3;
										if(data[i].Option4 != "None")
											questionBank[i][4]=data[i].Option4;	
								}
								console.log(questionBank);
								return questionBank;
								//callback(null, questionBank);
							}
							
					});	
    	}
  	}
  	
};