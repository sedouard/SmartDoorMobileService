var unirest = require('unirest');


exports.get = function(request, response) {
    if(!request.query.access_token){
        return response.send(400, {message: "must provide access_token uri parameter" } );
    }
    
    var req = unirest.get("https://graph.facebook.com/oauth/access_token?=" + request.)
    response.send(statusCodes.OK, { message : 'Hello World!' });
    response.send(statusCodes.OK, { message : 'Hello World!' });
};