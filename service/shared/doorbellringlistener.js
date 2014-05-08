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
function getPhotoForPointer(pointer, callback){
    var db = mongoose.connection;

    var procedure = function(){
        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: pointer.doorBellID }, function (err, doorbell) {
            
            if(err) {
                console.log('Could not query database');
                callback('Could not query database');
            }
            else if (doorbell == null) {
                console.log('Could not find doorbell ' + doorBellID);
                callback('Could not query database');
            }
            console.log('found doorbell ' + pointer.doorBellID);
            for(var i in doorbell.photos){
                if (pointer.imageId == doorbell.photos[i].blobPointer) {
                    callback(null,doorbell.photos[i]);
                    return;
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
            callback('Could not query database');
        });
        
    }
}
exports.startRingListener = function doorbellringlistener(){
    

    

    console.log('Doorbell Listener Started');

    var sb = azure.createServiceBusService(nconf.get("SmartDoor.Notifications.DoorbellServiceBus"));
    var hub = azure.createNotificationHubService(nconf.get("SmartDoor.Notifications.HubName"),
              nconf.get("SmartDoor.Notifications.HubConnString"));
    listenForMessages();


    //TODO: This function can use some cleanup, way too much nesting
    function listenForMessages() {
        //Listen for 60 seconds, this job runs for 60 seconds so we avoid having multiple invokations
        sb.receiveQueueMessage("arduino", { timeoutIntervalInS: 60 }, 
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
                            hub.wns.sendToastImageAndText02(doorBellObj.doorBellID, {
                                                    text1: msg,
                                                    text2: 'just rang!',
                                                    image1src: imageUrl,
                                                    image1alt: imageUrl
                               }, function(pushResponse) {
                                    console.log("Sent push:", pushResponse);
                            });
                    }

                    var req = unirest.get("https://face.p.mashape.com/faces/recognize?api_key="+nconf.get('SmartDoor.Identification.ApiKey')+"&api_secret="+nconf.get('SmartDoor.Identification.ApiSecret')+"&uids=all"+"&urls="+imageUrl+"&namespace="+nconf.get('SmartDoor.Identification.NamespaceName')+"&detector=aggresive&attributes=none&limit=3")
                      .headers({ 
                        "X-Mashape-Authorization": nconf.get('SmartDoor.Identification.MashapeKey'),
                        "Content-Type": 'application/json'
                      })
                      .timeout(60000)
                      .send()
                      .end(function (response) {
                        console.log('Response Status: ' + response.statusCode);
                        console.log('Message: ' + response.body.toString());
                        
                        if(response.body.status != 'error' && response.body.photos && response.body.photos.length > 0){
                            console.log("Mashape responded correctly");

                            //we always get one photo back because we sent one photo for recognition
                            console.log('tags ' + response.body.photos[0].tags);
                            console.log('tags.length' + response.body.photos[0].tags.length);
                            if(response.body.photos[0].tags.length > 0){
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
                                                getPhotoForPointer(doorBellObj,
                                                    function(err,result){
                                                        if(err){
                                                            console.err(err);
                                                            return;
                                                        }
                                                        result["identifiedPerson"] = {
                                                            confidence: confidence,
                                                            id: userid,
                                                            name: name
                                                        }
                                                        //we don't need to block the resposne for the save to the db
                                                        result.save(function (err) {
                                                            if (err) {
                                                                console.log('could not save identity to photo');
                                                            }
                                                            console.log('saved identity of photo: ' + result.blobPointer);
                                                        });
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

                            

                        }
                        else{
                            console.log('Mashape responded badly');
                            var date = new Date();
                    
                            sendPush(message);
                        }
                      });

                    
                }
                
                listenForMessages();
            });
    }
}
