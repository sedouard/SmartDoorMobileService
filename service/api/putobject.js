var mongoose = require('mongoose');
var nconf = require('nconf');
exports.put = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    //console.log('putobject script running from: ' + __dirname);
    console.log('Servicing request for doorbell registration' + request.body);
    nconf.argv()
    .env()
    .file({ file: '..\\shared\\ServiceConfiguration.json' });
    console.log('Connecting to mongodb: ' + nconf.get("SmartDoor.MongodbConnectionString"));
    //TODO: We really need to figure out why nconf doesn't work in mobile services
    mongoose.connect("mongodb://MongoLab-4q:X7TH5fVZWynS6qUM1rht7olpktsJgNr94_ArcTVwHqs-@ds030607.mongolab.com:30607/MongoLab-4q");

    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function callback() {
    	console.log("Sucessfully Logged into mongo");
    	var doorbellSchema = mongoose.Schema({
    		doorBellID: String,
    		users: [],
    		mobileDevices: []
		});

    	console.log('Looking for doorBellID ' + request.body.doorBellID + ' in mongo');
        var DoorBell = mongoose.model('DoorBell', doorbellSchema);
		DoorBell.findOne( {doorBellID: request.body.doorBellID} , function(err, doorbell){
			if(err) return console.error(err);

			if(doorbell == null){
				console.log('No registration found, creating a new one');
				//take the entire body's json. Assuming it fits into this schema
				var dbEntity = new DoorBell(request.body);
                dbEntity.save(function(err, entity){
                    console.log('sucessfully created new registration for registration: ' + entity);
                    response.send(statusCodes.OK, { message : 'Hello World!' });
                    return;
                });

			}
			//this doorbell has already been registered, update the registration
			else {
				//search if this user is already registered to this doorbell
				//this 2x for loop should be fine since we don't expect the
				//arrays to be large
				var userMatched = false;
				for(var u in doorbell.users)
				{
					for(var requestUser in request.body.users)
					{
						if(u.id == requestUser.id)
						{
							userMatched = true;
							break;
						}
					}
				}

				if(!userMatched) 
				{
					console.log('The specified user hasn not been registered to doorbell');
					console.log('registering user ' + request.body.users[0] + ' for doorbell ' + request.query.doorBellID)
					//assume that there is only one user
					doorbell.users.push(request.body.users[0]);
				}

				var deviceMatched = false;

				for(var m in doorbell.mobileDevices)
				{
					for(var requestDevice in request.body.mobileDevices)
					{
						if(m.deviceId == requestDevice.Id)
						{
							deviceMatched = true;
							break;
						}
					}
				}

				if(!deviceMatched){
					console.log('The specified device hasn not been registered to doorbell');
					console.log('registering device ' + request.body.mobileDevices[0] + ' for doorbell ' + request.query.doorBellID)
					//assume that there is only one user
					doorbell.users.push(request.body.users[0]);
				}

				doorbell.save(function(err, dBell){
					console.log('Sucessfully entered doorbell registration to MongoDB');
                    response.send(statusCodes.OK, { message : 'Hello World!' });
				});

			}
			
		});

    });

    
};
