var azure = require('azure');
function doorBellRingListener() {

    var sb = azure.createServiceBusService("Endpoint=sb://dpeproject.servicebus.windows.net/;SharedAccessKeyName=servicepolicy;SharedAccessKey=Xn1mYsNIRj47xd25AKeVa2Ant6eLC+Br0xrNfqQbhO4=");
    //var hub = new azure.NotificationHubService(nconf.get("SmartDoor.ServiceBus.DoorBellNotificationHubName"),
    //    nconf.get("SmartDoor.ServiceBus.DoorBellNotificationConnectionString"));
    
    listenForMessages();
    
    function listenForMessages() {
        sb.receiveQueueMessage("arduino", { timeoutIntervalInS: 90 }, 
        function(err, data) {
			if(data){
				//TODO: Send push notification from here
				console.log('Recieved ring notification for doorbell: ' + data.doorBellID);
				console.log(data);
				listenForMessages();
			}
		});
    }
}