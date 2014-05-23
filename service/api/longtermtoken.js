var unirest = require('unirest');


exports.get = function(request, response) {
    if(!request.query.access_token){
        return response.send(400, {message: "must provide access_token uri parameter" } );
    }
    
    var req = unirest.get("https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=" + nconf.get("SmartDoor.Facebook.ClientId") + "&client_secret=" + nconf.get("SmartDoor.Facebook.ClientSecret") + "&fb_exchange_token=" + request.query.access_token);
    req
    .send()
    .end(function(response) {
        if(response.body.access_token){
            response.send(statusCodes.OK, {access_token: response.body.access_token } );
        }
        else{
            response.send(500, { message: "Could not exchange access tokens" });
        }
    });
};