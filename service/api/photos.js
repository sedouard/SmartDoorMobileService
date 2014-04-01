var mongoosechemas = require('../shared/mongooschemas.js');
var nconf = require('nconf');
var mongoose = require('mongoose');

//Get the doorbell model. This function will take care of making sure it hasn't already
//been compiled
var DoorBell = mongoosechemas.DoorBell;

exports.post = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;

    response.send(statusCodes.OK, { message : 'Hello World!' });
};


//GET /api/photos?doorbellID=<id>
//returns all the photo objects for a specified doorbell
//Note: You shouldn't pass photo data through your mobile service. Have the client
//download it directly from the blob either using an SAS key or if the data is public
//just the image url within the container
exports.get = function(request, response) {
    
    var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
    console.log('Connecting to mongodb with connection string: ' + connectionString);
    
    var containerName = nconf.get('SmartDoor.Storage.PhotoContainerName');
    var accountName = nconf.get('SmartDoor.Storage.AccountName');
    var doorBellID = request.query.doorbellID;
    var imageUrl = accountName + '.blob.core.windows.net';
    
    mongoose.connect(connectionString);
    var db = mongoose.connection;
    
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function () {
        console.log("Sucessfully Logged into mongo");

        console.log('Looking for doorBellID ' + doorBellID + ' in mongo');
        
        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: doorBellID }, function (err, doorbell) {
            if(err) {
                mongoose.disconnect();
                return response.send(500, 'Could not query database');

            }
            if(doorbell == null){
                mongoose.disconnect();
                return response.send(404, 'Could not find doorbell ' + doorBellID);
            }

            

            for(var i in doorbell.photos){
                //construct the full url to the image blob
                var imageUrl = 'http://' + imageUrl + '/' + containerName + '/' + doorbell.photos[i].blobPointer+'.jpg';
                doorbell.photos[i].url = imageUrl;
            }

            response.send(statusCodes.OK, doorbell.photos);

        });
    });
    
};