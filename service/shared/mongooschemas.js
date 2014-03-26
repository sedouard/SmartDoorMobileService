var mongoose = require('mongoose');


exports.getDoorBellModel = function() {
	//Note, you should check if your model has already been compiled by some other api.
    //Otherwise you'll hit an exception that the model is already registered with
    //mongoose
    var doorbellSchema = mongoose.Schema({
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
    var DoorBell;
    try
    {
	    return DoorBell = mongoose.model('DoorBell');
	}
    //model isn't registered yet, so register it
    catch(e)
    {
        DoorBell = mongoose.model('DoorBell', doorbellSchema);
        return DoorBell;
    }

    
};
//Note, you sho