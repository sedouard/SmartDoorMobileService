//get config settings from azure mobile config dashboard page
var nconf = require('nconf');
nconf.argv().env();
var mongoose = require('mongoose');
var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
mongoose.connect(connectionString);
var photoSchema = mongoose.Schema({
                blobPointer: String,
                url : String,
                timestamp: String,
                //if the recognition guessed someone this is filled in
                identifiedPerson: {
                    //if confidence is 100, that means
                    //that the user idenfied this person at some point
                    confidence: Number,
                    id: String,
                    name: String
                },
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
            usersToDetect: [{
                userid: String,
                name: String,
                photos: String
            }],
            photos: [photoSchema]
        });

var Photo = mongoose.model('Photo', photoSchema)
var DoorBell = mongoose.model('DoorBell', doorbellSchema);

exports.DoorBell = DoorBell;
exports.Photo = Photo;
