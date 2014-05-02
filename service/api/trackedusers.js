var mongoose = require('mongoose');
var mongoosechemas = require('../shared/mongooschemas.js');
var DoorBell = mongoosechemas.DoorBell;
var nconf = require('nconf');

exports.get = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    var doorBellID = request.query.doorbellID;
    
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

            
            response.send(statusCodes.OK, doorbell.usersToDetect);

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