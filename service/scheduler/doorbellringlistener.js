var azure = require('azure');
var nconf = require('nconf');
var mongoose = require('mongoose');
var mongoosechemas = require('../shared/mongooschemas.js');
//Get the doorbell model. This function will take care of making sure it hasn't already
//been compiled
var DoorBell = mongoosechemas.DoorBell;
nconf.argv().env();
function doorBellRingListener() {

    var sb = azure.createServiceBusService(nconf.get("SmartDoor.Notifications.DoorbellServiceBus"));
    //var hub = new azure.NotificationHubService(nconf.get("SmartDoor.ServiceBus.DoorBellNotificationHubName"),
    //    nconf.get("SmartDoor.ServiceBus.DoorBellNotificationConnectionString"));
    
    listenForMessages();
    
    function listenForMessages() {
        //Listen for 59 seconds, this job runs for 60 seconds so we avoid having multiple invokations
        sb.receiveQueueMessage("arduino", { timeoutIntervalInS: 59 }, 
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
                    console.log('Connecting to mongodb');
                    
                    var db = mongoose.connection;
                    
                    var processNotifications = function(){
                        DoorBell.findOne({ doorBellID: doorBellObj.doorBellID }, function (err, doorbell) {
                            if(err) {
                                return console.error(err);
                            }
                            if(doorbell == null){
                                mongoose.disconnect();
                                return console.log('Could not find doorbellID ' + doorBellObj.doorBellID + ' notification. This is an unregistered device');
                            }
                            var date = new Date();

                            //TODO: Assign Names to doorbells
                            for(var user in doorbell.users){
                                for(var device in doorbell.users[user].mobileDevices){
                                    if(doorbell.users[user].mobileDevices[device].channel){
                                        push.wns.sendToastImageAndText03(doorbell.users[user].mobileDevices[device].channel, {
                                            text1: 'New Ring from your DoorBell ' + doorBellObj.doorBellID,
                                            text2: 'At ' + date.getHours() + ':' + date.getMinutes() + ' today',
                                            image1src: imageUrl,
                                            image1alt: imageUrl
                                        }, {
                                                success: function(pushResponse) {
                                                console.log("Sent push:", pushResponse);
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }
                    if(db.readyState = 1){
                        processNotifications();
                    } else{
                        console.error('Reconnecting to database');

                        var db = mongoose.connection;
                        db.on('open', function(){
                            processNotifications();
                        });
                        
                        db.on('error', function(){
                            console.error('Error connecting to mongodb');
                        })
                    }
                }
            });
    }
}