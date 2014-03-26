var qs = require('querystring');
var azure = require('azure');
var mongoose = require('mongoose');
var https = require('https');
var uuid = require('uuid');

var doorbellSchema = mongoose.Schema({
    doorBellID: String,
    users: [{
        id: String,
        mobileDevices: [{
            deviceId: String,
            channel: String
        }]
    }
    ],
    photos: [{
        //path in the main storage container
        blobId: String,
        //time photo was uploaded
        timeStamp: String
    }]
});
//Note, you should compile your models globally, as subsequent api calls may cause
//errors as you can only do this once per node instance.
var DoorBell = mongoose.model('DoorBell', doorbellSchema);
exports.get = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    
    var containerName = 'maincontainer';
    var accountName = 'smartdoor';
    var accountKey = 'fy6fTMAFrAPNH1raM5BivcGoxUiUufrVvVkvZsnKzmjCZw1w6eqQWyc5pnTebPwhXYG0Yk9rw5UeSo3uHEEXPA==';
    var host = accountName + '.blob.core.windows.net';
    var blobService = azure.createBlobService(accountName, accountKey, host);
    
    blobService.createContainerIfNotExists(containerName
        ,{publicAccessLevel : 'blob'}
        , function (error) {
            if (!error) {
                request.respond(200, item);
            } else {
                console.log(error);
                request.respond(statusCodes.OK);
            }
        });
    var sharedAccessPolicy = { 
        AccessPolicy: {
            Permissions: 'rw', //Read and Write permissions
            Expiry: minutesFromNow(5) 
        }
    };
    //create a time random id
    var id = uuid.v4();
    var sasUrl = blobService.generateSharedAccessSignature(containerName,
                    id+'.jpg', sharedAccessPolicy);
    


    var sasQueryString = { 'sasUrl' : sasUrl.baseUrl + sasUrl.path + '?' + qs.stringify(sasUrl.queryString) };                    
    
    addPhotoToDoorbell(request.query.doorbellID, id, function (err) {
        if (!err) {
            request.respond(500, 'Could not record photo entry in database');
        }
        request.respond(200, sasQueryString);
    });
    
};

function addPhotoToDoorbell(doorbellID, photoId, callback) {
    //TODO: We really need to figure out why nconf doesn't work in mobile services
    mongoose.connect("mongodb://MongoLab-4q:X7TH5fVZWynS6qUM1rht7olpktsJgNr94_ArcTVwHqs-@ds030607.mongolab.com:30607/MongoLab-4q");
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function callback() {
        console.log("Sucessfully Logged into mongo");
    });

    console.log('Looking for doorBellID ' + doorbellID + ' in mongo');
        
    DoorBell.findOne({ doorBellID: doorbellID }, function (err, doorbell) {
        if(err) return console.error(err);

        if(doorbell == null){
            callback('Could not find doorbellID' + doorbellID);
        }
        var date = new Date();

        if (doorbell.photos == null) {
            doorbell.photos = new Array();
        }
        doorbell.photos.push({
            blobId: photoId+'.jpg',
            timeStamp: date.getMilliseconds()
        });

        doorbell.save(function (err) {
            if(!err)
            {
                callback(false, 'Sucessfully created doorbell photo for ' + doorbellID);
            }
            else {
                callback(true, 'Failed to create doorbell photo for' + doorbellID);
            }
        })
    });
}

function minutesFromNow(minutes) {
    var date = new Date()
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}