/**
 * Copyright [2013] [runrightfast.co]
 * 
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

/**
 * This is meant to be integrated with the runrightfast-logging-service. It
 * provides a logHandler function that can be plugged into the LoggingService.
 * 
 * <code>
 * elastic: {
 *   ejs					REQUIRED - elastic.js ejs instance - require('elastic.js')
 *   index					OPTIONAL - name of elastic index to store the log events - default is 'log'
 *   type					OPTIONAL - name of elastic type - default is 'event'
 * } 
 * logLevel 	 			OPTIONAL - Default is 'WARN'
 * </code>
 */
(function() {
	'use strict';

	var logging = require('runrightfast-commons').logging;
	var log = logging.getLogger('runrighfast-couchbase-logger');
	var events = require('runrightfast-commons').events;
	var lodash = require('lodash');
	var util = require('util');
	var Hoek = require('hoek');
	var assert = Hoek.assert;
	var extend = require('extend');
	var joi = require('joi');

	var EVENTS = {
		LOG_EVENT_ERR : 'LOG_EVENT_ERR',
		LOGGED_EVENT : 'LOGGED_EVENT'
	};

	/**
	 * 
	 * @param options
	 */
	var ElasticLogger = function ElasticLogger(options) {
		events.AsyncEventEmitter.call(this);
		assert(lodash.isObject(options), 'options is required');

		var schema = {
			elastic : joi.types.Object({
				ejs : joi.types.Object().required(),
				index : joi.types.String(),
				type : joi.types.String()
			}).required(),
			logLevel : joi.types.String()
		};

		var settings = {
			elastic : {
				index : 'log',
				type : 'event'
			},
			logLevel : 'WARN'
		};

		extend(true, settings, options);

		var err = joi.validate(settings, schema);
		if (err) {
			throw err;
		}

		logging.setLogLevel(log, settings.logLevel);
		if (log.isLevelEnabled('DEBUG')) {
			log.debug(settings);
		}

		this.ejs = settings.elastic.ejs;
		this.index = settings.elastic.index;
		this.type = settings.elastic.type;
	};

	util.inherits(ElasticLogger, events.AsyncEventEmitter);

	ElasticLogger.prototype.events = EVENTS;

	/**
	 * emits the following events :
	 * 
	 * <code>
	 * 'LOG_EVENT_ERR'  		If logging the event failed, with event data (error, event, logger): { error : error, event : event, logger: logger }
	 * 'LOGGED_EVENT'			If logging the event was successful, then a 'LOGGED_EVENT' is emitted returning the ElasticSearch result as the event data
	 * </code>
	 * 
	 * @param event
	 */
	ElasticLogger.prototype.logEvent = function(event) {
		if (event) {
			var self = this;
			var doc = this.ejs.Document(this.index, this.type, event.id);
			doc.opType('create');
			doc.source(event);
			doc.doIndex(function(result) {
				if (result.error) {
					var err = new Error(result.error);
					err.code = result.status;
					self.emit(EVENTS.LOG_EVENT_ERR, err, event, self);
				} else {
					self.emit(EVENTS.LOGGED_EVENT, result);
				}
			}, function(err) {
				log.error('logEvent(): ' + err);
				self.emit(EVENTS.LOG_EVENT_ERR, err, event, self);
			});
		}
	};

	ElasticLogger.prototype.logListener = function() {
		return lodash.bind(this.logEvent, this);
	};

	ElasticLogger.prototype.toLoggingService = function(invalidEventListener) {
		var loggingServiceOptions = {
			logListener : this.logListener(),
			invalidEventListener : invalidEventListener
		};
		return require('runrightfast-logging-service')(loggingServiceOptions);
	};

	module.exports = ElasticLogger;

}());
