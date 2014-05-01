var nconf = require('nconf');
var https = require('https');
var mongoose = require('mongoose');
var mongoosechemas = require('../shared/mongooschemas.js');
nconf.argv().env();

exports.post = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;

    //make request to lambda api
    console.log('Executing registration request for userid ' + request.body.userid);
    var db = mongoose.connection;
    
    if(mongoose.connection.readyState == 1){
    
    	console.log("Sucessfully Logged into mongo");

    	var doorBellID = request.query.doorbellID;

        console.log('Looking for doorBellID ' + doorbellID + ' in mongo');
        

        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: doorbellID }, function (err, doorBell) {
            if (err) {
                console.log(err);
                return;
            }

            if (!doorBell.usersToDetect) {
                doorBell.usersToDetect = new Array();
            }

            var userAlreadyTracked = false;
            for (var i in doorBell.usersToDetect) {
                if (doorBell.usersToDetect[i].userid == request.body.userid) {
                    userAlreadyTracked = true;
                }
            }

            if (userAlreadyTracked) {
                //In the future we may allow users to rebuild training set
                console.log('User ' + request.body.userid + ' already being identified')
                response.send(statusCodes.OK, { message: 'User ' + request.body.userid + ' already being identified' });
                return;
            }

            //record this user and the training set
            doorBell.usersToDetect.push({ userid: request.body.userid, photos: reqeust.body.photos });

            var options = {
                hostname: 'lambda-face-recognition.p.mashape.com',
                port: 443,
                path: '/album_train?album=' + nconf.get('SmartDoor.Identification.AlbumName') + '&albumkey=' + nconf.get('SmartDoor.Identification.AlbumKey') +
                '&entryid=' + request.body.userid + '&urls=' + request.body.photos,
                method: 'POST',
                headers: { 'X-Mashape-Authorization': nconf.get('SmartDoor.Identification.ApiKey') }
            };

            var req = https.request(options, function (res) {
                console.log("statusCode: ", res.statusCode);
                console.log("headers: ", res.headers);
            });
            req.end();

            req.on('error', function (e) {
                console.error(e);
            });

            response.send(statusCodes.OK, { message: 'User ' + request.body.userid + ' is now being identified!' });
        });

    }
    else{
    	response.send(500, { message : 'could not connect to database' });
    	console.error("could not connect to database");
    }
	
	
	
};