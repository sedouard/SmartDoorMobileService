var azure = require('azure');
var mongoose = require('mongoose');
var mongoosechemas = require('../shared/mongooschemas.js');
var nconf = require('nconf');

//schema for the doorbell object in mongodb
var DoorBell = mongoosechemas.DoorBell;

function doorBellRingListener() {
    var sb = azure.createServiceBusService(nconf.get('SmartDoor.Notifications.DoorbellServiceBus'));
    
    listenForMessages();
    //TODO: We should validate the data coming from the SB. Its probably the most vulnerable part in terms of
    //malicious attack...
    function listenForMessages() {
        console.log('listening for messages on queue arduino')
        sb.receiveQueueMessage("arduino", { timeoutIntervalInS: 90 }, 
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
                
                var mongoConnString = nconf.get('SmartDoor.MongodbConnectionString');
                console.log('Connecting to mongodb with connection string: ' + mongoConnString);
			    mongoose.connect(mongoConnString);
                var db = mongoose.connection;
                
                db.on('error', console.error.bind(console, 'connection error:'));
                db.once('open', function () {
                    console.log("Sucessfully Logged into mongo");
                    console.log('Looking for doorBellID ' + doorBellObj.doorBellID + ' in mongo');
        
                    //Query for the speicfied doorbell. There should only be one in the DB.
                    DoorBell.findOne({ doorBellID: doorBellObj.doorBellID }, function (err, doorbell) {
                        if(err) return console.error(err);

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

                        mongoose.disconnect();
                    });
    				
                });
			}
            //look for more messages
            listenForMessages();
		});
    }
}