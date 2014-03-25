var mongoose = require('mongoose');
var nconf = require('nconf');
exports.put = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    console.log('Servicing request ' + request);
    nconf.argv()
    .env()
    .file({ file: '..\shared\ServiceConfiguration.json' });
    console.log('Connecting to mongodb: ' + nconf.get("SmartDoor.MongodbConnectionString"));
    mongoose.connect(nconf.get("SmartDoor.MongodbConnectionString"));

    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function callback() {
    	console.log("Sucessfully Logged into mongo");
    	var doorbellSchema = mongoose.Schema({
    		doorBellID: String,
    		users: [],
    		mobileDevices: []
		});

    	console.log('Looking for doorbellID ' + request.body.doorBellID + ' in mongo');
		doorbellSchema.findOne( {doorBellID: request.query.doorBellID} , function(err, doorbell){
			if(err) return console.error(err);

			if(doorbell == null){
				var DoorBell = mongoose.model('DoorBell', doorbellSchema);
				//take the entire body's json. Assuming it fits into this schema
				var dbEntity = new DoorBell(request.body);

			}
			//this doorbell has already been registered
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
