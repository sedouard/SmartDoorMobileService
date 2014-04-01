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
//get config settings. Note for azure mobile services, you should use the absolute path, as relative
//paths (eg: file: 'config.jsn') doesn't work. Also do not name your file '.json' or else azure will
//pick it up as a route configuration rather than a service configuration
nconf.argv().env()
exports.get = function(request, response) {
    
    console.log('Query params: ' + request.query);
    
    if(request.query.doorbellID == null)
    {
        return request.respond(400,{message: 'Must specifiy doorbellID in url parameters'});
    }
    
    var containerName = nconf.get('SmartDoor.Storage.PhotoContainerName');
    var accountName = nconf.get('SmartDoor.Storage.AccountName');
    var accountKey = nconf.get('SmartDoor.Storage,AccountKey');
    var host = accountName + '.blob.core.windows.net';
    
    console.log('Connecting to blob service account: ' + accountName);
    var blobService = azure=createBlobService(accountName, accountKey, host);
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



            var sasQueryString = { 'sasUrl': sasUrl.baseUrl + sasUrl.path + '?' + qs.stringify(sasUrl.queryString) };

            console.log('Adding photo ' + id + '.jpg to doorbell ' + request.query.doorBellID);
            addPhotoToDoorbell(request.query.doorbellID, id, function (err) {
                if (err) {
                    console.log(err);
                    return request.respond(400, { message: err });
                }
                //Indicate that the photo was entered into the system
                //and that the file should be uploaded via a PUT to
                //the provided SAS url,
                return request.respond(201, { sasUrl: sasQueryString, photoId: id });
            });
        });
    
   
    
}

function addPhotoToDoorbell(doorbellID, photoId, callback) {
    //TODO: We really need to figure out why nconf doesn't work in mobile services
    var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
    console.log('Connecting to mongodb with connection string: ' + connectionString);
    
    mongoose.connect(connectionString);
    var db = mongoose.connection;
    
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        console.log("Sucessfully Logged into mongo");

        console.log('Looking for doorBellID ' + doorbellID + ' in mongo');
        
        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: doorbellID }, function (err, doorbell) {
            if(err) return console.error(err);

            if(doorbell == null){
                return callback('Could not find doorbellID ' + doorbellID);
            }

            //Create a new entry for photo and associate with this doorbell
            var date = new Date();

            if (!doorbell.hasOwnProperty("photos")) {
                doorbell.photos = new Array();
            }
            doorbell.photos.push({
                blobId: photoId+'.jpg',
                timeStamp: date.getMilliseconds()
            });

            doorbell.save(function (err) {
                    if(err)
                    {
                        return callback(err);
                    }
                    else
                    {
                        //We sucessfully associated this photo
                        //to the doorbell.
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
