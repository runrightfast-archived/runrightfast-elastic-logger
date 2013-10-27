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

'use strict';
var expect = require('chai').expect;
var uuid = require('runrightfast-commons').uuid;
var ElasticSearchClient = require('runrightfast-elasticsearch').ElasticSearchClient;
var ejs = new ElasticSearchClient({
	host : 'localhost',
	port : 9200
}).ejs;

var ElasticLogger = require('..');

describe('ElasticLogger', function() {
	var logger = null;

	before(function() {

		logger = new ElasticLogger({
			elastic : {
				ejs : ejs
			},
			logLevel : 'DEBUG'
		});
	});

	afterEach(function() {
		logger.removeAllListeners();
	});

	it('will fail to create if construction options are invalid', function(done) {
		try {
			new ElasticLogger({});
			done(new Error('expected error because elastic.ejs option is required'));
		} catch (err) {
			console.log(err);
			done();
		}
	});

	it('#logEvent - 1 event', function(done) {
		var loggedEventListener = function(result) {
			console.log('loggedEventListener: ' + JSON.stringify(result));
			done();
		};

		var logErrorEventListener = function(errorEvent) {
			console.log('logErrorEventListener: ' + JSON.stringify(errorEvent));
			done(errorEvent.error);
		};

		logger.once(logger.events.LOGGED_EVENT, loggedEventListener).once(logger.events.LOG_EVENT_ERR, logErrorEventListener);
		expect(logger.listeners(logger.events.LOGGED_EVENT).length).to.be.at.least(1);
		expect(logger.listeners(logger.events.LOG_EVENT_ERR).length).to.be.at.least(1);

		var event = {
			tags : [ 'info' ],
			data : 'test message from logger.logEvent',
			ts : new Date(),
			id : uuid()
		};
		logger.logEvent(event);

	});

	it('#logEvent - 10 times', function(done) {
		var counter = 0;
		var i;
		var event;
		var isDone = false;

		var loggedEventListener = function(result) {
			counter++;
			console.log('loggedEventListener : #%d: ', counter, JSON.stringify(result));
			if (counter === 10) {
				if (!isDone) {
					isDone = true;
					done();
				}
			}
		};

		var logErrorEventListener = function(errorEvent) {
			console.log('logErrorEventListener: ' + JSON.stringify(errorEvent));
			done(errorEvent.error);
		};

		for (i = 0; i < 10; i++) {
			logger.once(logger.events.LOGGED_EVENT, loggedEventListener).once(logger.events.LOG_EVENT_ERR, logErrorEventListener);
			expect(logger.listeners(logger.events.LOGGED_EVENT).length).to.be.at.least(1);
			expect(logger.listeners(logger.events.LOG_EVENT_ERR).length).to.be.at.least(1);
			event = {
				tags : [ 'info' ],
				data : 'test message from logger.logEvent',
				ts : new Date(),
				id : uuid()
			};
			logger.logEvent(event);
		}
	});

	it('#logListener', function(done) {
		var loggedEventListener = function(result) {
			console.log('loggedEventListener: ' + JSON.stringify(result));
			done();
		};

		var logErrorEventListener = function(errorEvent) {
			console.log('logErrorEventListener: ' + JSON.stringify(errorEvent));
			done(errorEvent.error);
		};

		logger.once(logger.events.LOGGED_EVENT, loggedEventListener).once(logger.events.LOG_EVENT_ERR, logErrorEventListener);
		var listeners = logger.listeners(logger.events.LOGGED_EVENT);
		expect(listeners.length).to.equal(1);

		var event = {
			tags : [ 'info' ],
			data : 'test message from logger.logEvent',
			ts : new Date(),
			id : uuid()
		};
		var logListener = logger.logListener();
		logListener(event);
	});

	it("#logEvent - emits 'LOG_EVENT_ERR' when logging the event fails", function(done) {
		var event = {
			tags : [ 'info' ],
			data : 'test message from logger.logEvent',
			ts : new Date(),
			id : uuid()
		};

		logger.once(logger.events.LOG_EVENT_ERR, function(error, event2, logger) {
			try {
				expect(error).to.exist;
				expect(event2).to.exist;
				expect(event2.uuid).to.equal(event.uuid);
				expect(logger).to.exist;
				console.log('typeof logger : ' + (typeof logger));

				if (error instanceof Error) {
					done();
				} else {
					done(new Error('expected an Error but got : ' + error));
				}
			} catch (err) {
				done(err);
			}

		});

		logger.logEvent(event);
		logger.logEvent(event);
	});

	it('can integrate with runrightfast-logging-service', function(done) {
		var loggingServiceOptions = {
			logListener : logger.logListener()
		};
		var loggingService = require('runrightfast-logging-service')(loggingServiceOptions);

		logger.on(logger.events.LOGGED_EVENT, function(result) {
			console.log('EVENT WAS LOGGED : ' + JSON.stringify(result));
			done();
		});

		var event = {
			tags : [ 'info' ],
			data : 'test message from logger.logEvent',
			ts : new Date(),
			id : uuid()
		};
		loggingService.log(event);
	});

	it('can can be converted to a runrightfast-logging-service instance', function(done) {
		var loggingService = logger.toLoggingService();

		logger.on(logger.events.LOGGED_EVENT, function(result) {
			console.log('EVENT WAS LOGGED : ' + JSON.stringify(result));
			done();
		});

		var event = {
			tags : [ 'info' ],
			data : 'test message from logger.logEvent',
			ts : new Date(),
			id : uuid()
		};
		loggingService.log({
			data : 'bad event'
		});
		loggingService.log(event);
	});

	it('can can be converted to a runrightfast-logging-service instance', function() {
		var loggingService = logger.toLoggingService();

		var event = {
			tags : [ 'info' ],
			data : 'test message from logger.logEvent',
			ts : new Date(),
			id : uuid()
		};
		loggingService.log({
			data : 'bad event'
		});
		loggingService.log(event);
	});

});