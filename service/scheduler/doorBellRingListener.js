var azure = require('azure');
var nconf = require('nconf');
function doorBellRingListener() {
    nconf.argv()
        .env()
        .file({ file: 'Web.config.json' });
    
    
    var sb = azure.createServiceBusService(nconf.get("Endpoint=sb://dpeproject.servicebus.windows.net/;SharedAccessKeyName=servicepolicy;SharedAccessKey=Xn1mYsNIRj47xd25AKeVa2Ant6eLC+Br0xrNfqQbhO4="));
    //var hub = new azure.NotificationHubService(nconf.get("SmartDoor.ServiceBus.DoorBellNotificationHubName"),
    //    nconf.get("SmartDoor.ServiceBus.DoorBellNotificationConnectionString"));
    
    listenForMessages();
    
    function listenForMessages() {
        sb.receiveQueueMessage(nconf.get("arduino"), { timeoutIntervalInS: 90 }, 
        function(err, data) {
            //TODO: Send push notification from here
            console.log(data);
            listenForMessages();
        });
    }
}