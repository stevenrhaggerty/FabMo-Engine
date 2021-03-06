var path = require('path');
var util = require('util');
var fs = require('fs-extra');
var PLATFORM = require('process').platform;
var G2 = require('../g2.js');
var exec = require('child_process').exec;
Config = require('./config').Config;
var log = require('../log');
var logger = log.logger('config');
var profiles = require('../profiles');

// The EngineConfig object keeps track of engine-specific settings
EngineConfig = function() {
	Config.call(this, 'engine');
};
util.inherits(EngineConfig, Config);

EngineConfig.prototype.update = function(data, callback) {
	var profile_changed = false;
	try {
		for(var key in data) {
			if((key === 'profile')) {
				var newProfile = data[key];
/*				if(newProfile && newProfile != 'default') {
					try {
						var profileDir = __dirname + '/../profiles/' + newProfile;
						var stat = fs.statSync(profileDir);								
						if(!stat.isDirectory()) {
							throw new Error('Not a directory: ' + profileDir)
						} else {
							// New profile directory exists
						}
					} catch(e) {
						logger.warn(e);
						data[key] = 'default';
					}
				}
*/
				if((key in this._cache) && (data[key] != this._cache[key]) && (this.userConfigLoaded) && (this._cache[key])) {
					try { log.info("Profile changed"); }
					catch(err) {}
					profile_changed = true;
				}
			}
			this._cache[key] = data[key];				
		}
	} catch (e) {
		if(callback) {
			return setImmediate(callback, e);
		}
	}

	var that = this;
	function save(callback) {
		that.save(function(err, result) {
			if(err) {
				typeof callback === 'function' && callback(e);
			} else {
				typeof callback === 'function' && callback(null, data);
			}
		});
	};
	if(profile_changed) {
		logger.warn('Engine profile changed - engine will be restarted.')
		profiles.apply(newProfile, function(err, data) {
			if(err) {
				console.log(err);
				callback(err);
			} else {
				console.log('shutting down');
				process.exit(1);
			}
		});
/*
		Config.deleteProfileData(function(err) {
			save(function(err) {
				if(err) { return callback(err); }
				//callback();
			})
		});
		*/
	} else {
		save(callback);
	}
};

EngineConfig.prototype.apply = function(callback) {
	try {
		log.setGlobalLevel(this.get('log_level'));
		callback(null, this);
	}
	catch (e) {
		callback(e);
	}
};


exports.EngineConfig = EngineConfig;
