var mongoose = require('mongoose');

exports.doorbellSchema = mongoose.Schema({
    		doorBellID: String,
    		users: [{
                    id : String,
                    mobileDevices: [{
                        deviceId : String,
                        channel : String
                    }]
                }
            ],
    		photos: [{
                blobPointer: String,
                timestamp: String
            }]
		});
exports.getDoorBellModel = function() {
	//Note, you should compile your models globally, as subsequent api calls may cause
	//errors as you can only do this once per node instance.
    var DoorBell;
    try
    {
	   DoorBell = mongoose.model('DoorBell');
	}
    //model isn't registered yet, so register it
    catch(e)
    {
        DoorBell = mongoose.model('DoorBell', exports.doorbellSchema);
    }
};
//Note, you sho