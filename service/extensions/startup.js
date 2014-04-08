var doorbellListener = require('../shared/doorbellringlistener.js');
exports.startup = function(context, done) {
		console.log('Initializing Serivce...');
		doorbellListener.startRingListener();
		done();
	};