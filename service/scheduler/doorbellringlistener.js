var azure = require('azure');
var mongoose = require('mongoose');
var mongoosechemas = require('../shared/mongooschemas.js');
var nconf = require*('nconf');

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
                var doorBellObj = JSON.parse(data.body);
                console.log('Recieved notification: ' + doorBellObj.doorBellID);
			    console.log('Connecting to mongodb');
                
			    mongoose.connect(nconf.get('SmartDoor.MongodbConnectionString'));
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

                        for(var user in doorbell.users){
                            for(var device in doorbell.users[user].mobileDevices){
                                if(doorbell.users[user].mobileDevices[device].channel){
                                    push.wns.sendToastText04(doorbell.users[user].mobileDevices[device].channel, {
                                    text1: 'New Ring from DoorBell ' + doorBellObj.doorBellID
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