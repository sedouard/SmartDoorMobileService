var unirest = require('unirest');
var mongoose = require('mongoose');
var unirest = require('unirest');
var nconf = require('nconf');
var common = require('../shared/common.js');
exports.delete = function(request, response) {
 
    var blobPointer = request.query.blobPointer;
    var userid = request.query.userid;
    var doorbellID = request.query.doorbellID;
    var db = mongoose.connection;

    //grab the doorbell
    common.getDoorBell({doorBellID: doorbellID}, function(err, result){
        if(err){
            response.send(500, err);
            return;
        }
        var found = false;
        for(var i in result.photos){
            
            if(result.photos[i].blobPointer == blobPointer 
                && result.photos[i].identifiedPerson.id == userid){
                    result.photos[i].identifiedPerson = null;
                    found = true;
                    //ask skybiometry to delete tag
                    unirest.get("https://face.p.mashape.com/tags/remove?api_key="+nconf.get('SmartDoor.Identification.ApiKey')+"&api_secret="+nconf.get('SmartDoor.Identification.ApiSecret')+"&tids="+result.photos[i].tid)
                      .headers({ 
                        "X-Mashape-Authorization": nconf.get('SmartDoor.Identification.MashapeKey'),
                        "Content-Type": 'application/json'
                      })
                      .send()
                      .end(function (response2) {
                            if(response2.body.status != 'error'){
                                //now commit to the database
                                result.save(function(err){
                                if(err){
                                    response.send(500, {message:'failed to save to database'});
                                    return;
                                }
                                    console.log('Sucessfully removed tag '); 
                                    response.send(statusCodes.OK, {message:'Sucessfully removed tag'});

                                })
                            }
                      });

                    
            }
        }
        if(!found){
            response.send(400,{message: "This tag doesn't exist!"})
        }
    })
};
//used for the user to manually identify. This will not post the tag to sky biometry.
//Use registerrecognition to add training photos to face recog. This just updates
//the tagged user in the database
exports.post = function(request, response){

    var blobPointer = request.query.blobPointer;
    var userid = request.query.userid;
    var doorbellID = request.query.doorbellID;
    var name = request.query.name;
    var db = mongoose.connection;

    //grab the doorbell
    common.getDoorBell({doorBellID: doorbellID}, function(err, result){
        if(err){
            response.send(500, err);
            return;
        }
        //update each matching tag's person with the one specified by client
        //there should only be 1
        for(var i in result.photos){

            if(result.photos[i].blobPointer == blobPointer){
                    result.photos[i].identifiedPerson = { 
                        id: userid,
                        confidence: 100,
                        name: name
                    };
                    //now commit to the database
                    result.save(function(err){
                        if(err){
                            response.send(500, {message:err});
                            return;
                        }
                        console.log('Sucessfully removed tag '); 
                        response.send(statusCodes.OK, {message:'Sucessfully removed tag'});

                    });    
            }
        }
    })
}