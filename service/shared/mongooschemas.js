//get config settings from azure mobile config dashboard page
nconf.argv().env();
var mongoose = require('mongoose');
var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
mongoose.connect(connectionString);
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
