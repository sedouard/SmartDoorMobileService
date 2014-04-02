var qs = require('qs');
var azure = require('azure');
var mongoose = require('mongoose');
var https = require('https');
var uuid = require('uuid');
var mongoosechemas = require('../shared/mongooschemas.js');
var nconf = require('nconf');
//Get the doorbell model. This function will take care of making sure it hasn't already
//been compiled
var DoorBell = mongoosechemas.DoorBell;
var Photo = mongoosechemas.Photo;


//get config settings from azure mobile config dashboard page
nconf.argv().env();
exports.get = function(request, response) {
    
    console.log('Query params: ' + request.query);
    
    if(request.query.doorbellID == null)
    {
        return request.respond(400,{message: 'Must specifiy doorbellID in url parameters'});
    }
    var containerName = nconf.get('SmartDoor.Storage.PhotoContainerName');
    var accountName = nconf.get('SmartDoor.Storage.AccountName');
    var accountKey = nconf.get('SmartDoor.Storage.AccountKey');
    
    var host = accountName + '.blob.core.windows.net';
    console.log('Connecting to blob service account: ' + accountName);
    var blobService = azure.createBlobService(accountName, accountKey, host);
    blobService.createContainerIfNotExists(containerName
        , { publicAccessLevel: 'blob' }
        , function (error) {
            if (error) {
                console.log(error);
                return request.respond(500, { message: 'Could not create blob' });
            }
            var sharedAccessPolicy = {
                AccessPolicy: {
                    Permissions: 'rw', //Read and Write permissions
                    Expiry: minutesFromNow(5)
                }
            };
            //create a time random id
            var id = uuid.v4();
            var sasUrl = blobService.generateSharedAccessSignature(containerName,
                            id + '.jpg', sharedAccessPolicy);



            var sasResponse = { 'sasUrl': sasUrl.baseUrl + sasUrl.path + '?' + qs.stringify(sasUrl.queryString), 'photoId': id };

            console.log('Adding photo ' + id + '.jpg to doorbell ' + request.query.doorbellID);
            addPhotoToDoorbell(request.query.doorbellID, id, function (err) {
                if (err) {
                    console.log(err);
                    return request.respond(400, { message: err });
                }
                //Indicate that the photo was entered into the system
                //and that the file should be uploaded via a PUT to
                //the provided SAS url,
                return request.respond(201, sasResponse);
            });
        });
    
   
    
}

function addPhotoToDoorbell(doorbellID, photoId, callback) {
    //TODO: We really need to figure out why nconf doesn't work in mobile services
    var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
    console.log('Connecting to mongodb with connection string: ' + connectionString);
    var containerName = nconf.get('SmartDoor.Storage.PhotoContainerName');
    var accountName = nconf.get('SmartDoor.Storage.AccountName');
    var host = accountName + '.blob.core.windows.net';
    mongoose.connect(connectionString);
    var db = mongoose.connection;
    
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        console.log("Sucessfully Logged into mongo");

        console.log('Looking for doorBellID ' + doorbellID + ' in mongo');
        

        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: doorbellID }, function (err, doorbell) {
            if(err) {
                mongoose.disconnect();
                return console.error(err);
            }
            if(doorbell == null){
                mongoose.disconnect();
                return callback('Could not find doorbellID ' + doorbellID);
            }

            //Create a new entry for photo and associate with this doorbell
            var date = new Date();

            if (!doorbell.photos) {
                console.log('debug: doorbell has no photo property, creating...');
                doorbell.photos = new Array();
            }

            doorbell.photos.push( new Photo({
                blobPointer: photoId ,
                timeStamp: date.getMilliseconds(),
                url: 'http://' + host + '/' + containerName + '/' + photoId +'.jpg'
            }));

            doorbell.save(function (err) {
                    if(err)
                    {
                        mongoose.disconnect();
                        return callback(err);
                    }
                    else
                    {
                        //We sucessfully associated this photo
                        //to the doorbell.
                        console.log('sucessfully added photo ' + photoId + ' to doorbell ' + doorbellID);
                        mongoose.disconnect();
                        return callback(false);
                    }
                });
        });
        
    });

    
}

function minutesFromNow(minutes) {
    var date = new Date()
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}
