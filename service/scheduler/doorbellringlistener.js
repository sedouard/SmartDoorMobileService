/**
This task really only needs to run once because after that we'll be listeneing to the service bus forever.
**WARNING** Set this script to run at most once every 3 months, or just 'On Demand' otherwise gradually
your compute bill will go through the roof!
**/
function doorbellringlistener(){
    var azure = require('azure');
    var nconf = require('nconf');
    var mongoose = require('mongoose');
    var mongoosechemas = require('../shared/mongooschemas.js');
    
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
        //Listen for 59 seconds, this job runs for 60 seconds so we avoid having multiple invokations
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
                    console.log('Connecting to mongodb');
                    var date = new Date();
                    
                    //TODO: It's super easy to send notifications to andriod/ios/wp8 too. We just need
                    //to modify the platform specific payload. In this case I'm using hub.wns because
                    //I'm telling the hub to notify all windows 8 devices registerd for this doorbell
                    var wnspayload = '<toast><visual><binding template="ToastImageAndText01"><image id="1" src='+ imageUrl +' alt='+imageUrl+'/><text id="1">New doorbell notification from ' + doorBellObj.doorBellID +'</text></binding>  </visual></toast>'
                    
                    //send a toast notification to all win 8 devices with a picture for this doorbell
                    hub.wns.send(doorBellObj.doorBellID, wnspayload, {
                                        success: function(pushResponse) {
                                        console.log("Sent push:", pushResponse);
                                    }
                                });
                }
                
                listenForMessages();
            });
    }
}
