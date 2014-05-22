var c_Timeout = 10;
var azure = require('azure');
var nconf = require('nconf');
var mongooseSchemas = require('../shared/mongooschemas.js');
var unirest = require('unirest');
var mongoose = require('mongoose');
//Get the doorbell model. This function will take care of making sure it hasn't already
//been compiled
var DoorBell = mongooseSchemas.DoorBell;
//pickup config values
nconf.argv().env();


function getNameforUserid(doorBellID, userid, callback){
    var db = mongoose.connection;

    var procedure = function(){
        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: doorBellID }, function (err, doorbell) {
            
            if(err) {
                console.log('Could not query database');
                callback(null);
            }
            else if(doorbell == null){
                console.log('Could not find doorbell ' + doorBellID);
                callback(null);
            }
            console.log('found doorbell ' + doorBellID);
            for(var i in doorbell.usersToDetect){
                if(userid == doorbell.usersToDetect[i].userid){
                    callback(doorbell.usersToDetect[i].name);
                    break;
                }
            }

        });

    }
    if(db.readyState == 1){
        procedure();
    } else{
        db.connect();
        var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
        mongoose.connect(connectionString);
        
        db.on('connect', function(){
            procedure();
        });
        db.on('error', function(){
            callback(null);
        });
        
    }
}

//returns a photo object from mongo with the cooresponding pointer
//export this as a global
g_getDoorBell = function getDoorBell(pointer, callback){
    var db = mongoose.connection;

    var procedure = function(){
        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: pointer.doorBellID }, function (err, doorbell) {
            
            if(err) {
                console.log('Could not query database');
                callback('Could not query database');
            }
            else if (doorbell == null) {
                console.log('Could not find doorbell ');
                callback('Could not query database');
            }
            console.log('found doorbell ' + pointer.doorBellID);
            callback(null,doorbell);
            

        });

    }
    if(db.readyState == 1){
        procedure();
    } else{
        db.connect();
        var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
        mongoose.connect(connectionString);
        
        db.on('connect', function(){
            procedure();
        });
        db.on('error', function(){
            callback('Could not query database');
        });
        
    }
}

function doorbellListener() {
    
	var date = new Date();
    var time = date.getTime();
    //get the current unix time in seconds
    var startSeconds = time / 1000;

    var sb = azure.createServiceBusService(nconf.get("SmartDoor.Notifications.DoorbellServiceBus"));
    var hub = azure.createNotificationHubService(nconf.get("SmartDoor.Notifications.HubName"),
              nconf.get("SmartDoor.Notifications.HubConnString"));
    listenForMessages(c_Timeout);


    //TODO: This function can use some cleanup, way too much nesting
    function listenForMessages(seconds) {
    	console.log('Doorbell Listener Started for timeout: ' + seconds);
        //Listen for 60 seconds, this job runs for 60 seconds so we avoid having multiple invokations
        sb.receiveQueueMessage("arduino", { timeoutIntervalInS: seconds }, 
            function(err, data) { 
                if(!err){
                    //storage container settings
                    var containerName = nconf.get('SmartDoor.Storage.PhotoContainerName');
                    var accountName = nconf.get('SmartDoor.Storage.AccountName');
                    var doorBellObj = JSON.parse(data.body);
                    var imageUrl = accountName + '.blob.core.windows.net';
                    //image url in blob storage
                    imageUrl = 'http://' + imageUrl + '/' + containerName + '/' + doorBellObj.imageId+'.jpg';

                    console.log('Recieved notification: ' + doorBellObj.doorBellID);
                    console.log('with image ' + imageUrl);
                    var message = 'Somebody';
                    //attempt to get identification

                    var sendPush = function(msg){
                        var date = new Date();
                    
                            //TODO: It's super easy to send notifications to andriod/ios/wp8 too. We just need
                            //to modify the platform specific payload. In this case I'm using hub.wns because
                            //I'm telling the hub to notify all windows 8 devices registerd for this doorbell

                            //The first argument is the tag that I want to send a notification to
                        console.log('Sending push...');
                        
                        //(note) this works the same for windows phone and windows! :-)
                        //toast notification
                            hub.wns.sendToastImageAndText02(doorBellObj.doorBellID, {
                                                    text1: msg,
                                                    text2: 'just rang!',
                                                    image1src: imageUrl,
                                                    image1alt: imageUrl
                            }, function (error) {
                                if (!error) {
                                    console.log("Sent push!");
                                    return;
                                }
                                
                                console.error(error);
                            });
                       //update tiles
                       hub.wns.sendTileSquare150x150PeekImageAndText03(doorBellObj.doorBellID, {
                                text1: msg + 'just rang!',
                                image11: imageUrl
                            },
                            function(error){
                                if(!error){
                                    console.log("Sent tile update!");
                                }
                            }
                       );
                    }

                    //TODO: This is getting sort of messy
                    var req = unirest.get("https://face.p.mashape.com/faces/recognize?api_key="+nconf.get('SmartDoor.Identification.ApiKey')+"&api_secret="+nconf.get('SmartDoor.Identification.ApiSecret')+"&uids=all"+"&urls="+imageUrl+"&namespace="+nconf.get('SmartDoor.Identification.NamespaceName')+"&detector=aggresive&attributes=none&limit=3")
                      .headers({ 
                        "X-Mashape-Authorization": nconf.get('SmartDoor.Identification.MashapeKey'),
                        "Content-Type": 'application/json'
                      }) 
                      .timeout(60000)
                      .send()
                      .end(function (response) {
                        console.log('Response Status: ' + response.statusCode);
                        
                        //validate response
                        if(response.body && response.body.status != 'error' && response.body.photos && response.body.photos.length > 0){
                            console.log("Mashape responded correctly");

                            console.log('Message: ' + response.body.toString());

                            //we always get one photo back because we sent one photo for recognition
                            if(response.body.photos[0].tags &&
                                response.body.photos[0].tags.length > 0){
                                var tags = response.body.photos[0].tags;
                                console.log('got tag' + tags[0]);
                                console.log('with uids' + tags[0].uids);
                                //we aren't going to try to deal with the case with > 1 face on the doorbell cam
                                if(tags[0].uids && tags[0].uids.length > 0){
                                    var threshold = parseFloat(nconf.get("SmartDoor.Identification.ConfidenceLevel"));
                                    var gotIdMatch = false;
                                    for(var i in tags[0].uids){
                                        var confidence = parseFloat(tags[0].uids[i].confidence);
                                        console.log('confidence: ' + confidence);
                                        console.log('threshold: ' + threshold);
                                        if(confidence > threshold){
                                            console.log('Found identification for picture!!!');
                                            gotIdMatch = true;
                                            var userid = tags[0].uids[i].uid;
                                            userid = userid.replace("Facebook", "Facebook:");
                                            userid = userid.replace("@"+nconf.get("SmartDoor.Identification.NamespaceName"),"");

                                            console.log('Getting name for userid ' + userid);
                                            getNameforUserid(doorBellObj.doorBellID, userid, function(name){
                                                if(!name){
                                                    console.error('could not find user name in mongo for ' + userid);
                                                    return;
                                                }

                                                //we go the picture pointer get the oject
                                                g_getDoorBell(doorBellObj,
                                                    function(err,result){
                                                        if(err){
                                                            console.err(err);
                                                            return;
                                                        }
                                                        for (var i in result.photos) {
                                                            if (doorBellObj.imageId == result.photos[i].blobPointer) {
                                                                result.photos[i]["identifiedPerson"] = {
                                                                    confidence: confidence,
                                                                    id: userid,
                                                                    name: name,
                                                                    tid: tags[0].tid
                                                                }
                                                                result.save(function (err) {
                                                                if (err) {
                                                                        console.log('could not save identity to photo');
                                                                    }
                                                                console.log('saved identity of photo: ' + result.photos[i].blobPointer);
                                                                });
                                                                return;
                                                                
                                                            }
                                                        }
                                                        
                                                        //we don't need to block the resposne for the save to the db
                                                        
                                                    });
                                                console.log('got name ' + userid);
                                                message = message.replace("Somebody", name);
                                                sendPush(message);
                                            });
                                            
                                            break;
                                        }
                                    }
                                    
                                    if(!gotIdMatch){
                                        sendPush(message);
                                    }

                                }
                                else{
                                    sendPush(message);
                                }
                            }
                            else {
                                sendPush(message);
                            }
                            

                        }
                        else{
                            console.log('Mashape responded badly');
                            var date = new Date();
                    
                            sendPush(message);
                        }
                      });
                }
                else{
                	console.log(err);
                }
                var continueRecieveMessages = function(){
				   //go back and listen for more message for the duration of this task
				   var currentDate = new Date();
				   var currentSeconds = currentDate.getTime() / 1000;
				   
				   console.log('currentSeconds ' + currentSeconds);
				   console.log('startSeconds ' + startSeconds);
				   var newTimeout = Math.round((c_Timeout - (currentSeconds - startSeconds)));
				   if(newTimeout > 0){
					   //note: the recieveQueueMessage function takes ints no decimals!!
					   listenForMessages(newTimeout);
				   }
			    }

			    continueRecieveMessages();
            });
    }
}