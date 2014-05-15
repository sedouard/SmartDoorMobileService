
exports.get = function(request, response) {
    response.send(statusCodes.OK, { message : 'Yup!' });
};