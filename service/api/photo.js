var qs = require('querystring');
var azure = require('azure');
var mongoose = require('mongoose');
var https = require('https');
var uuid = require('uuid');
var mongoosechemas = require('../shared/mongoosechemas.js');
var nconf = require('nconf');
//Note, you should compile your models globally, as subsequent api calls may cause
//errors as you can only do this once per node instance.
var DoorBell = mongoosechemas.getDoorBellModel();
nconf.argv().env().file({ file: '../shared/config.json' });
exports.get = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    
    var containerName = nconf.get('SmartDoor.Storage.PhotoContainerName');
    var accountName = nconf.get('SmartDoor.Storage.AccountName');
    var accountKey = nconf.get('SmartDoor.Storage,AccountKey');
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
    var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
    console.log('Connecting to mongodb with connection string: ' + connectionString);
    mongoose.connect(connectionString);
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function callback() {
        console.log("Sucessfully Logged into mongo");

        console.log('Looking for doorBellID ' + doorbellID + ' in mongo');
        
        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: doorbellID }, function (err, doorbell) {
        if(err) return console.error(err);

        if(doorbell == null){
            callback('Could not find doorbellID' + doorbellID);
        }

        //Create a new entry for photo and associate with this doorbell
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
    });

    
}

function minutesFromNow(minutes) {
    var date = new Date()
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}
