exports.delete = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    var blobPointer = request.query.blobPointer;
    var userid = request.query.userid;
    var doorbellID = request.query.doorbellID;
    var unirest = require('unirest');
    var mongoose = require('mongoose');
    var db = mongoose.connection;
 
    //grab the doorbell
    g_getDoorBell({doorbellID: doorbellID}, function(err, result){
        if(err){
            response.send(500, err);
            return;
        }
        for(var i in result.photos){
            if(result.photos[i].blobPointer == blobPointer 
                && result.photos[i].identifiedPerson.userid == userid){
                    result.photos[i].identifiedPerson = null;

                    //ask skybiometry to delete tag
                    var req = unirest.get("https://face.p.mashape.com/tags/remove?api_key="+nconf.get('SmartDoor.Identification.ApiKey')+"&api_secret="+nconf.get('SmartDoor.Identification.ApiSecret')+"&tids"=result.photos[i].tid)
                      .headers({ 
                        "X-Mashape-Authorization": nconf.get('SmartDoor.Identification.MashapeKey'),
                        "Content-Type": 'application/json'
                      })
                      .send()
                      .end(function (response) {
                            if(response.body.status != 'error'){
                                //now commit to the database
                                result.save(function(err){
                                if(err){
                                    response.send(500, {message:'failed to save to database'});
                                    return;
                                }
                                    response.send(statusCodes.OK, {message:'Sucessfully removed tag'});

                                })
                            }
                      });

                    
            }
        }
    })
};
