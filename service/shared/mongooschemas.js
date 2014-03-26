var mongoose = require('mongoose');
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

var DoorBell = mongoose.model('DoorBell', doorbellSchema);

exports.DoorBell = DoorBell;
