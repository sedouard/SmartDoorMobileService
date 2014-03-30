var azure = require('azure');
var mongoose = require('mongoose');
var mongoosechemas = require('../shared/mongooschemas.js');

//schema for the doorbell object in mongodb
var DoorBell = mongoosechemas.DoorBell;

function doorBellRingListener() {
    //TODO: can't use nconf because __dirname isn't supported in scheduled tasks for some reason :-(
    var sb = azure.createServiceBusService('Endpoint=sb://dpeproject.servicebus.windows.net/;SharedAccessKeyName=servicepolicy;SharedAccessKey=Xn1mYsNIRj47xd25AKeVa2Ant6eLC+Br0xrNfqQbhO4=');
    
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
                imageUrl = imageUrl + '/' + containerName + doorBellObj.body.imageId;

                console.log('Recieved notification: ' + doorBellObj.doorBellID);
			    console.log('Connecting to mongodb');
                
			    mongoose.connect('mongodb://MongoLab-4q:X7TH5fVZWynS6qUM1rht7olpktsJgNr94_ArcTVwHqs-@ds030607.mongolab.com:30607/MongoLab-4q');
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