var nconf = require('nconf');
var https = require('https');

nconf.argv().env();

exports.post = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;

    //make request to lambda api
    console.log('Executing registration request for userid ' + request.body.userid);

	var options = {
	  hostname: 'lambda-face-recognition.p.mashape.com',
	  port: 443,
	  path: '/album_train?album=' +nconf.get('SmartDoor.Identification.AlbumName') + '&albumkey=' + nconf.get('SmartDoor.Identification.AlbumKey') +
	  '&entryid=' + request.body.userid + '&urls=' + request.body.photos,
	  method: 'POST',
	  headers: {'X-Mashape-Authorization':nconf.get('SmartDoor.Identification.ApiKey')}
	};

	var req = https.request(options, function(res) {
	  console.log("statusCode: ", res.statusCode);
	  console.log("headers: ", res.headers);

	  res.on('data', function(d) {
	    process.stdout.write(d);
	  });
	});
	req.end();

	req.on('error', function(e) {
	  console.error(e);
	});
	
	response.send(statusCodes.OK, { message : 'Hello World!' });
};

exports.get = function(request, response) {
    response.send(statusCodes.OK, { message : 'Hello World!' });
};