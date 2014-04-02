var mongoose = require('mongoose');
var photoSchema = mongoose.Schema({
                blobPointer: String,
                url : String,
                timestamp: String
            });
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
            photos: [photoSchema]
        });

var Photo = mongoose.model('Photo', photoSchema)
var DoorBell = mongoose.model('DoorBell', doorbellSchema);

exports.DoorBell = DoorBell;
exports.Photo = Photo;
