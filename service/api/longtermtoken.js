var unirest = require('unirest');
var nconf = require('nconf');
nconf.argv().env();
exports.get = function(request, response) {
    if(!request.query.access_token){
        return response.send(400, {message: "must provide access_token uri parameter" } );
    }
    
    var req = unirest.get("https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id=" + nconf.get("SmartDoor.Facebook.ClientId") + "&client_secret=" + nconf.get("SmartDoor.Facebook.ClientSecret") + "&fb_exchange_token=" + request.query.access_token);
    req
    .send()
    .end(function(resp) {
        var url = resp.body;
        var querystring = {};
        var accessTokPatter = new RegExp("access_token=.*&expires");
        var results = accessTokPatter.exec(url);

        if (results.length <= 0) {
            response.send(500, {message: 'Unexpected access token response from FB'});
        }
        else{
            results[0] = results[0].replace("access_token=", "");
            results[0] = results[0].replace("&expires", "");

            var longTermToken = results[0];
            response.send(200, {access_token: longTermToken});
        }

        

    });
};