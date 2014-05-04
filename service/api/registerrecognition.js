var nconf = require('nconf');
var https = require('https');
var mongoose = require('mongoose');
var mongoosechemas = require('../shared/mongooschemas.js');
var unirest = require('unirest');
var DoorBell = mongoosechemas.DoorBell;
nconf.argv().env();

exports.post = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    
    //make request to lambda api
    console.log('Executing registration request for userid ' + request.body.userid);
    var db = mongoose.connection;
    
    if(!request.query.doorbellID){
        response.send(400, { message : 'doorbellID is a required url parameter' });
    }
    
    if(mongoose.connection.readyState == 1){
    
    	console.log("Sucessfully Logged into mongo");

    	var doorBellID = request.query.doorbellID;

        console.log('Looking for doorBellID ' + doorBellID + ' in mongo');
        

        //Query for the speicfied doorbell. There should only be one in the DB.
        DoorBell.findOne({ doorBellID: doorBellID }, function (err, doorBell) {
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

            
            //console.log('calling lambda face recognition');
            console.log('calling skybiometry face recognition...');
            console.log('Using api key: '+nconf.get('SmartDoor.Identification.ApiKey'));
            console.log('Using api secret: ' + nconf.get('SmartDoor.Identification.ApiSecret'));
            console.log('Using namespace: ' + nconf.get('SmartDoor.Identification.NamespaceName'));
            
            /**
            Process of setup up a face for recogntion:
            1) Call faces/detect to collect a series of face recogition tags for a particular person
            2) Call tags/save to save those tags and associate them with a userid. The user id takes the form of
            entryid@namespace where entryid is the entryid variable we decide to be the facebook user id and the namespace
            is the default namepsace specified by the configuration.
            3) call faces/recognize when an image comes in to recognize the user who rang
            **/
            console.log("Making request GET https://face.p.mashape.com/faces/detect?api_key="+nconf.get('SmartDoor.Identification.ApiKey')+"&api_secret="+nconf.get('SmartDoor.Identification.ApiSecret')+"&urls="+request.body.photos);
            var entryid = request.body.userid.replace("Facebook:","Facebook");
            var req = unirest.get("https://face.p.mashape.com/faces/detect?api_key="+nconf.get('SmartDoor.Identification.ApiKey')+"&api_secret="+nconf.get('SmartDoor.Identification.ApiSecret')+"&urls="+request.body.photos)
              .headers({ 
                "Content-Type": "application/json",
                "X-Mashape-Authorization": nconf.get('SmartDoor.Identification.MashapeKey')
              })
              .timeout(60000)
              .send()
              .end(function (resp) {
                console.log('Response Status: ' + resp.statusCode);
                console.log('Message: ' + resp.body);
                var body = resp.body;
                if(resp.body.status && resp.body.status != 'error'){
                	var tags = "";
                	for(var i in body.photos){
                		
                		if(body.photos[i].tags){
                            //we make the enforcement tha the client only sends pictures of people with only 1 face in it.
                            //we do this because we don't want to deal with the complexity of multiple faces in training pictures
                            if(body.photos[i].tags.length > 1){
                            response.send(400, { message: 'You must send photos with clearly only 1 face in it. This photo has more than one face ' + body.photos[i].url });
                            return;
                            }

                            if(body.photos[i].tags.length == 1){
                                tags += body.photos[i].tags[0].tid + ',';
                            }
                            //0 tags just means no faces detected
                        }
                        
                		
                	}

                	if(tags.length == 0){
                		response.send(400, { message: 'None of the photos you sent had faces in it. ' + body.photos[i].url });
                		return;
                	}
                	console.log('Making request GET ' + "https://face.p.mashape.com/tags/save?api_key="+nconf.get('SmartDoor.Identification.ApiKey')+"&api_secret="+nconf.get('SmartDoor.Identification.ApiSecret')+"&uid="+entryid+'@'+nconf.get("SmartDoor.Identification.NamespaceName")+"&tids="+tags);
                	//now we need to save the tags...
                	var req = unirest.get("https://face.p.mashape.com/tags/save?api_key="+nconf.get('SmartDoor.Identification.ApiKey')+"&api_secret="+nconf.get('SmartDoor.Identification.ApiSecret')+"&uid="+entryid+'%40'+nconf.get("SmartDoor.Identification.NamespaceName")+"&tids="+tags)
		              .headers({ 
		                "Content-Type": 'application/json',
		                "X-Mashape-Authorization": nconf.get('SmartDoor.Identification.MashapeKey')
		              })
		              .timeout(60000)
		              .send()
		              .end(function (resp2) {
		              	console.log('Response Status: ' + resp2.statusCode);
                		console.log('Message: ' + resp2.body);

                		if(resp2.status && resp2.status != 'error'){
                			//record this user and the training set
		                    console.log('Horray, we registered ' + request.body.userid + ' for recognition');
		                    doorBell.usersToDetect.push({ userid: request.body.userid, name:request.body.name, photos: request.body.photos });
		                    doorBell.save(function (err) {
		                        if(err)
		                        {
		                            response.send(500, { message: 'could not record identification tracking status to mongo' }); 
		                            return;
		                        }
		                        else
		                        {
		                            //We sucessfully associated this photo
		                            //to the doorbell.
		                            response.send(statusCodes.OK, { message: 'User ' + request.body.userid + ' is now being identified!' });
		                            return;
		                        }
		                    });
                		}
		              });

                    
                    
                }
                else{
                    response.send(500, { message: 'Mashape responded badly' });
                }
              });
                
                
            });

    }
    else{
    	response.send(500, { message : 'could not connect to database' });
    	console.error("could not connect to database");
    }
	
	
	
};