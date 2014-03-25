var qs = require('querystring');
var azure = require('azure');
var mongoose = require('mongoose');

exports.post = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    
    var containerName = 'maincontainer';
    var accountName = 'smartdoor';
    var accountKey = 'fy6fTMAFrAPNH1raM5BivcGoxUiUufrVvVkvZsnKzmjCZw1w6eqQWyc5pnTebPwhXYG0Yk9rw5UeSo3uHEEXPA==';
    var host = accountName + '.blob.core.windows.net';
    var blobService = azure.createBlobService(accountName, accountKey, host);
    
    blobService.createContainerIfNotExists(containerName
        ,{publicAccessLevel : 'blob'}
        , function (error) {
            if (!error) {
                request.respond(200, item);
            } else {
                console.log(error);
                request.respond(statusCodes.OK);
            }
        });
       var sharedAccessPolicy = { 
        AccessPolicy: {
            Permissions: 'rw', //Read and Write permissions
            Expiry: minutesFromNow(5) 
        }
    };
    
    var sasUrl = blobService.generateSharedAccessSignature(containerName,
                    request.query.fileName, sharedAccessPolicy);
    
    var sasQueryString = { 'sasUrl' : sasUrl.baseUrl + sasUrl.path + '?' + qs.stringify(sasUrl.queryString) };                    
    
    request.respond(200, sasQueryString);
};

exports.get = function(request, response) {
    response.send(statusCodes.OK, { message : 'Hello World!' });
};

function minutesFromNow(minutes) {
    var date = new Date()
  date.setMinutes(date.getMinutes() + minutes);
  return date;
}