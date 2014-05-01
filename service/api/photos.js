var mongoosechemas = require('../shared/mongooschemas.js');
var nconf = require('nconf');
var mongoose = require('mongoose');
var https = require('https');
//Get the doorbell model. This function will take care of making sure it hasn't already
//been compiled
var DoorBell = mongoosechemas.DoorBell;
nconf.argv().env()
exports.post = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    var options = {
      hostname: 'lambda-face-recognition.p.mashape.com',
      port: 443,
      path: '/album_train',
      method: 'POST',
      headers: {
            'X-Mashape-Authorization': nconf.get('')
          }
    };
    
    var req = https.request(options, function(res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        console.log('BODY: ' + chunk);
      });
    });
    
    req.on('error', function(e) {
      console.log('problem with request: ' + e.message);
    });
    
    // write data to request body
    req.write('data\n');
    req.write('data\n');
    req.end();
    
    response.send(statusCodes.OK, { message : 'Hello World!' });
};


//GET /api/photos?doorbellID=<id>
//returns all the photo objects for a specified doorbell
//Note: You shouldn't pass photo data through your mobile service. Have the client
//download it directly from the blob either using an SAS key or if the data is public
//just the image url within the container
exports.get = function(request, response) {
    
    var containerName = nconf.get('SmartDoor.Storage.PhotoContainerName');
    var accountName = nconf.get('SmartDoor.Storage.AccountName');
    var doorBellID = request.query.doorBellID;
    var imageUrl = accountName + '.blob.core.windows.net';
    
    var db = mongoose.connection;
    
    var procedure = function(){
        console.log("Sucessfully Logged into mongo");

        console.log('Looking for doorBellID ' + doorBellID + ' in mongo');
        
        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: doorBellID }, function (err, doorbell) {

            if(err) {
                response.send(500, 'Could not query database');
            }
            else if(doorbell == null){
                response.send(404, 'Could not find doorbell ' + doorBellID);
            }

            
            response.send(statusCodes.OK, doorbell.photos);

        });
    };
    
    if(db.readyState == 1){
        procedure();
    } else{
        db.connect();
        var connectionString = nconf.get('SmartDoor.MongodbConnectionString');
        mongoose.connect(connectionString);
        
        db.on('connect', function(){
            procedure();
        });
        db.on('error', function(){
            response.send(500, 'Could not connect to database');
        });
        
    }

    
};