var doorbellListener = require('../shared/doorbellListener.js');
exports.startup = function(context, done) {
		console.log('Initializing Serivce...');
		doorbellListener.startRingListener();
	};