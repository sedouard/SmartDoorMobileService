var qs = require('querystring');
var azure = require('azure');
exports.post = function(request, response) {
    // Use "request.service" to access features of your mobile service, e.g.:
    //   var tables = request.service.tables;
    //   var push = request.service.push;
    
    var containerName = 'maincontainer';
    var accountName = 'touchgram';
    var accountKey = 'TfCN96/gajQTvm3mPWp/fd3oH1v6guqAod18mJtBweTgR5gfIgMMhX9RqLQbGu6LJqMKTuDFJ7sVguysETjRPQ==';
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