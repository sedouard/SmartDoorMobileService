var azure = require('azure');
var mongoose = require('mongoose');
function doorBellRingListener() {

    var sb = azure.createServiceBusService("Endpoint=sb://dpeproject.servicebus.windows.net/;SharedAccessKeyName=servicepolicy;SharedAccessKey=Xn1mYsNIRj47xd25AKeVa2Ant6eLC+Br0xrNfqQbhO4=");
    //var hub = new azure.NotificationHubService(nconf.get("SmartDoor.ServiceBus.DoorBellNotificationHubName"),
    //    nconf.get("SmartDoor.ServiceBus.DoorBellNotificationConnectionString"));
    
    listenForMessages();
    
    function listenForMessages() {
        sb.receiveQueueMessage("arduino", { timeoutIntervalInS: 90 }, 
        function(err, data) {
			if(data){
                
				push.wns.sendToastText04(device.channelUri, {
                        text1: item.text
                    }, {
                        success: function(pushResponse) {
                            console.log("Sent push:", pushResponse);
                        }
                    });
                 
				
			}else
            {
                listenForMessages();
            }
		});
    }
}