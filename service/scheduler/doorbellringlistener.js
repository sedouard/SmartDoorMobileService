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
        sb.receiveQueueMessage("arduino", { timeoutIntervalInS: 90 }, 
        function(err, data) {
			if(!err){
                console.log('Recieved notification: ' + data.body.doorbellID);
			    console.log('Connecting to mongodb');
                
			    mongoose.connect('mongodb://MongoLab-4q:X7TH5fVZWynS6qUM1rht7olpktsJgNr94_ArcTVwHqs-@ds030607.mongolab.com:30607/MongoLab-4q');
                var db = mongoose.connection;
                
                db.on('error', console.error.bind(console, 'connection error:'));
                db.once('open', function () {
                    console.log("Sucessfully Logged into mongo");
                    console.log('Looking for doorBellID ' + data.body.doorbellID + ' in mongo');
        
                    //Query for the speicfied doorbell. There should only be one in the DB.
                    DoorBell.findOne({ doorBellID: data.body.doorbellID }, function (err, doorbell) {
                        if(err) return console.error(err);

                        if(doorbell == null){
                            mongoose.disconnect();
                            return console.log('Could not find doorbellID ' + data.body.doorbellID + ' notification. This is an unregistered device');
                        }

                        for(var user in doorbell.users){
                            for(var device in user.devices){
                                push.wns.sendToastText04(device.channel, {
                                text1: 'New Ring from DoorBell ' + data.body.doorbellID
                                }, {
                                        success: function(pushResponse) {
                                        console.log("Sent push:", pushResponse);
                                    }
                                }); 
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