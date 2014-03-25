function doorBellRingListener() {
    var azure = require('azure');
    var nconf = require('nconf');
    nconf.argv()
        .env()
        .file({ file: 'Web.config.json' });
    
    
    var sb = azure.createServiceBusService(nconf.get("SmartDoor.ServiceBus.ConnectionString"));
    //var hub = new azure.NotificationHubService(nconf.get("SmartDoor.ServiceBus.DoorBellNotificationHubName"),
    //    nconf.get("SmartDoor.ServiceBus.DoorBellNotificationConnectionString"));
    
    listenForMessages();
    
    function listenForMessages() {
        sb.receiveQueueMessage(nconf.get("SmartDoor.ServiceBus.IncomingNotificationQueue"), { timeoutIntervalInS: 90 }, 
        function(err, data) {
            //TODO: Send push notification from here
            console.log(data);
            listenForMessages();
        });
    }
}