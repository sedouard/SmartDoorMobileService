var azure = require('azure');
var mongoose = require('mongoose');
var mongoosechemas = require('../shared/mongooschemas.js');
var nconf = require('nconf');

//schema for the doorbell object in mongodb
var DoorBell = mongoosechemas.DoorBell;

var filename = module.uri;
var dirname = path.dirname(filename);

nconf.file({ file: dirname + '/../shared/config.jsn' });
function doorBellRingListener() {

    var sb = azure.createServiceBusService(nconf.get("SmartDoor.Notifications.DoorbellServiceBus"));
    
    listenForMessages();
    //TODO: We should validate the data coming from the SB. Its probably the most vulnerable part in terms of
    //malicious attack...
    function listenForMessages() {
        sb.receiveQueueMessage("arduino", { timeoutIntervalInS: 90 }, 
        function(err, data) {
			if(data){
                var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
                console.log('Connecting to mongodb with connection string: ' + connectionString);
                
                mongoose.connect(connectionString);
                var db = mongoose.connection;
                
                db.on('error', console.error.bind(console, 'connection error:'));
                db.once('open', function () {
                    console.log("Sucessfully Logged into mongo");
                    console.log('Looking for doorBellID ' + data.doorbellID + ' in mongo');
        
                    //Query for the speicfied doorbell. There should only be one in the DB.
                    DoorBell.findOne({ doorBellID: data.doorbellID }, function (err, doorbell) {
                        if(err) return console.error(err);

                        if(doorbell == null){
                            return callback('Could not find doorbellID ' + data.doorbellID);
                        }

                        for(var user in doorbell.users){
                            for(var device in user.devices){
                                push.wns.sendToastText04(device.channel, {
                                text1: 'New Ring from DoorBell ' + data.doorBellID
                                }, {
                                        success: function(pushResponse) {
                                        console.log("Sent push:", pushResponse);
                                    }
                                }); 
                            }
                        }
                    });
    				
                });
                listenForMessages();
			}
            else
            {
                //no new messages
                listenForMessages();
            }
		});
    }
}