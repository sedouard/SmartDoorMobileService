var azure = require('azure');
var mongoose = require('mongoose');
nconf.file({ file: __dirname + '/../shared/config.jsn' });
function doorBellRingListener() {

    var sb = azure.createServiceBusService(nconf.get("SmartDoor.Notifications.DoorbellServiceBus"));
    
    listenForMessages();
    
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
                    console.log('Looking for doorBellID ' + doorbellID + ' in mongo');
        
                    //Query for the speicfied doorbell. There should only be one in the DB.
                    DoorBell.findOne({ doorBellID: doorbellID }, function (err, doorbell) {
                        if(err) return console.error(err);

                        if(doorbell == null){
                            return callback('Could not find doorbellID ' + doorbellID);
                        }

                        for(var user in doorbell.users){
                            for(var device in user.devices){
                                push.wns.sendToastText04(device.channel, {
                                text1: 'New Ring from DoorBell ' + doorBellID
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