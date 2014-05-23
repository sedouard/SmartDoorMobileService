
var c_Timeout = 60;
var azure = require('azure');
var nconf = require('nconf');
var mongooseSchemas = require('../shared/mongooschemas.js');
var common = require('../shared/common.js');
var unirest = require('unirest');
var mongoose = require('mongoose');
//Get the doorbell model. This function will take care of making sure it hasn't already
//been compiled
var DoorBell = mongooseSchemas.DoorBell;
//pickup config values
nconf.argv().env();
