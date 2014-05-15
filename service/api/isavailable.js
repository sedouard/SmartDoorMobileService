
exports.get = function(request, response) {
	//send generic ok
    response.send(statusCodes.OK, { message : 'Yup!' });
};