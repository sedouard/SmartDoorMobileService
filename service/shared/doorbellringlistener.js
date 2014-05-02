
exports.startRingListener = function doorbellringlistener(){
    var azure = require('azure');
    var nconf = require('nconf');
    var mongoosechemas = require('../shared/mongooschemas.js');
    var unirest = require('unirest');
    
    //Get the doorbell model. This function will take care of making sure it hasn't already
    //been compiled
    var DoorBell = mongoosechemas.DoorBell;
    nconf.argv().env();

    console.log('Doorbell Listener Started');

    var sb = azure.createServiceBusService(nconf.get("SmartDoor.Notifications.DoorbellServiceBus"));
    var hub = azure.createNotificationHubService(nconf.get("SmartDoor.Notifications.HubName"),
              nconf.get("SmartDoor.Notifications.HubConnString"));
    listenForMessages();

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
                    var message = 'Somebody just rang!';
                    //attempt to get identification
                    var req = unirest.post("https://lambda-face-recognition.p.mashape.com/recognize?album="+nconf.get('SmartDoor.Identification.AlbumName')+"&albumkey="+nconf.get('SmartDoor.Identification.AlbumKey')+"&urls="+imageUrl)
                      .headers({ 
                        "X-Mashape-Authorization": nconf.get('SmartDoor.Identification.ApiKey'),
                        "Content-Type": 'application/json'
                      })
                      .timeout(60000)
                      .send()
                      .end(function (response) {
                        console.log('Response Status: ' + response.statusCode);
                        console.log('Message: ' + response.body);
                        
                        if(response.statusCode == 200 && response.body.photos && response.body.photos.length > 0){
                            console.log("Mashape responded correctly");

                            //we always get one photo back because we sent one photo for recognition
                            //we aren't going to try to deal with the case with > 1 face on the doorbell cam
                            if(response.body.photos[0].tags.length > 0){
                                var tags = repsonse.body.photos[0].tags;
                                if(tags.uids.length > 0){
                                    var threshold = parseFloat(nconf.get("SmartDoor.Identification.ConfidenceLevel"));

                                    for(var i in tags.uids){
                                        var confidence = parseFloat(tags.uids[i].confidence);
                                        if(confidence > threshold){
                                            console.log('Found identification for picture!!!');
                                            message.replace("Somebody", tags.uids[i].prediction);
                                        }
                                    }
                                }
                            }

                        }
                        else{
                            console.log('Mashape responded badly');
                        }
                      });

                    var date = new Date();
                    
                    //TODO: It's super easy to send notifications to andriod/ios/wp8 too. We just need
                    //to modify the platform specific payload. In this case I'm using hub.wns because
                    //I'm telling the hub to notify all windows 8 devices registerd for this doorbell

                    //The first argument is the tag that I want to send a notification to
                    hub.wns.sendToastImageAndText02(doorBellObj.doorBellID, {
                                            text1: message,
                                            text2: doorBellObj.doorBellID,
                                            image1src: imageUrl,
                                            image1alt: imageUrl
                       }, function(pushResponse) {
                            console.log("Sent push:", pushResponse);
                    });
                }
                
                listenForMessages();
            });
    }
}
