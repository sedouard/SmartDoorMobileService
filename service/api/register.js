var mongoose = require('mongoose');
var nconf = require('nconf');
var mongoosechemas = require('../shared/mongooschemas.js');

//schema for the doorbell object in mongodb
var DoorBell = mongoosechemas.DoorBell;
//get config settings. Note for azure mobile services, you should use the absolute path, as relative
//paths (eg: file: 'config.jsn') doesn't work. Also do not name your file '.json' or else azure will
//pick it up as a route configuration rather than a service configuration
nconf.argv().env();

//Begin POST api, this api will register or update the registration of the doorbell object
//the request body.

//POST - smartdoor.azure-mobile.net/register
/**
 * BODY an object like the following:
 * {
   "doorBellID":"0101010",
   "users":[{
         "id":"facebook:1423438",
         "mobileDevices":[
              {
                   "deviceId":"safasdfe0",
                   "channel":"http://your.device.channel"
              }
         ]
      }]
    }
 */
exports.post = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    //console.log('putobject script running from: ' + __dirname);
    console.log('Servicing request for doorbell registration' + request.body);
    console.log('Connecting to mongodb: ' + nconf.get("SmartDoor.MongodbConnectionString"));
    //TODO: We really need to figure out why nconf doesn't work in mobile services
    mongoose.connect(nconf.get("SmartDoor.MongodbConnectionString"));

    var db = mongoose.connection;
    var procedure = function(){
        console.log("Sucessfully Logged into mongo");

        console.log('Looking for doorBellID ' + request.body.doorBellID + ' in mongo');
        
        DoorBell.findOne({ doorBellID: request.body.doorBellID }, function (err, doorbell) {
           if (err) return console.error(err);

           if (doorbell == null) {
               console.log('No registration found, creating a new one');
               //take the entire body's json. Assuming it fits into this schema
               var dbEntity = new DoorBell(request.body);
               dbEntity.save(function (err, entity) {
                   console.log('sucessfully created new registration for registration: ' + entity);
                   response.send(201, { message: 'Sucessfully created doorbell registration for doorBellID: ' + request.body.doorBellID });
                   return;
               });

           }
               //this doorbell has already been registered, update the registration
           else {
               //search if this user is already registered to this doorbell
               //this 2x for loop should be fine since we don't expect the
               //arrays to be large
               var userMatched = false;
               for (var u in doorbell.users) {
                   //there is expected to only be one user in the request user array
                   if (doorbell.users[u].id == request.body.users[0].id) {
                       console.log('user already registered for this doorbell');
                       userMatched = true;
                       var deviceMatched = false;
                       //check to see if this device is already registered for this user, for this doorbell
                       for (var i in doorbell.users[u].mobileDevices) {
                           var deviceFromClient = request.body.users[0].mobileDevices[0];
                           if (doorbell.users[u].mobileDevices[i].deviceId == deviceFromClient.deviceId) {
                               //we found a match, update the device push notification channel
                               console.log('updating user ' + doorbell.users[u].id + ' device channel');
                               //Update the stored matching device with the newest provided channel
                               doorbell.users[u].mobileDevices[i].channel = deviceFromClient.channel;
                               deviceMatched = true;
                               break;
                           }
                       }

                       if (!deviceMatched) {
                           console.log('The specified device for user ' + request.body.users[0].id + ' hasn not been registered to doorbell '
                           + request.body.doorBellID);
                           console.log('registering device ' + request.body.users[0].mobileDevices[0].deviceId + ' for doorbell ' + request.body.doorBellID)
                           doorbell.users[u].mobileDevices.push(request.body.users[0].mobileDevices[0]);
                       }
                       break;
                   }

               }

               if (!userMatched) {
                   console.log('The specified user hasn not been registered to doorbell');
                   console.log('registering user ' + request.body.users[0].id + ' for doorbell ' + request.body.doorBellID)
                   //assume that there is only one user
                   doorbell.users.push(request.body.users[0]);
               }

               var deviceMatched = false;

               //iterate through all the mobile devices registered for users of this doorbell
               //if the mobile device specified in the request doesn't exist, add it. If it does
               //exist, update the channel
               //we only allow one device insertion/update at a time
               for (var m in doorbell.users.mobileDevices) {
                   for (var i in request.body.users.mobileDevices) {
                       if (request.body.users.mobileDevices[i].deviceId == doorbell.users.mobileDevices[i].deviceId) {
                           deviceMatched = true;
                           //update the already registered device's push notification channel with 
                           //the freshest one
                           console.log('Updating the channel for registered device ' + request.body.users.mobileDevices[i].deviceId);
                           doorbell.users.mobileDevices[i].channel = request.body.users.mobileDevices[i].channel;
                           //we are done because we updated the mobile device
                           break;
                       }
                   }
               }

               doorbell.save(function (err, dBell) {
                   console.log('Sucessfully updated doorbell registration ' + request.body.doorBellID + ' in MongoDB');
                   response.send(statusCodes.OK, { message: 'Sucessfully updated doorbell registration ' + request.body.doorBellID });
               });
           }
        });
    };
    db.on('error', function(err){
        //check if connection is open
        if(err.status == 2){
            procedure();
        }
        else{
            console.error(err);
        }
});
    db.once('open', function callback() {
            procedure();
        });


    
};
