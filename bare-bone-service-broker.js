/**
 * Created by Mark van Holsteijn, Xebia Nederland B.V.
 *
 * A bare bone Foundry Service Broker, complying to version 2.4 of the interface specification
 * http://docs.cloudfoundry.org/services/api.html
 *
 */
'use strict';

var restify = require('restify');
var async = require('async');
var Handlebars = require('handlebars');
var config = require('./config/bare-bone-service-broker');
var server = restify.createServer({
    name: 'bare-bone-service-broker'
});


server.use(apiVersionChecker({
    'major': 2,
    'minor': 4
}));
server.use(restify.authorizationParser());
server.use(authenticate(config.credentials));
server.use(restify.fullResponse());
server.use(restify.bodyParser());
server.pre(restify.pre.userAgentConnection());


function checkConsistency() {
    var i, id, p, msg, plans, catalog;

    catalog = config.catalog;
    plans = config.plans;

    for (i = 0; i < catalog.services.length; i += 1) {
        for (p = 0; p < catalog.services[i].plans.length; p += 1) {
            id = catalog.services[i].plans[p].id;
            if (!plans.hasOwnProperty(id)) {
                msg = "ERROR: plan '" + catalog.services[i].plans[p].name + "' of service '" + catalog.services[i].name + "' is missing a specification.";
                throw new Error(msg);
            }
        }
    }
}

// get catalog
server.get('/v2/catalog', function(request, response, next) {
    response.send(config.catalog);
    next();
});

// create service
server.put('/v2/service_instances/:id', function(request, response, next) {
    response.send(501, {
        'description': 'create/provision service not implemented'
    });
    next();
});

// delete service
server.del('/v2/service_instances/:id', function(req, response, next) {
    response.send(501, {
        'description': 'delete/unprovision service not implemented'
    });
    next();
});

// bind service
server.put('/v2/service_instances/:instance_id/service_bindings/:id', function(req, response, next) {
    response.send(501, {
        'description': 'bind service not implemented'
    });
    next();
});

// unbind service
server.del('/v2/service_instances/:instance_id/service_bindings/:id', function(req, response, next) {
    response.send(501, {
        'description': 'unbind service not implemented'
    });
    next();
});


// list services (Not in spec :-)
server.get('/v2/service_instances', function(request, response, next) {
    response.send(501, {
        'description': 'show all service instances not implemented'
    });
    next();
});

function apiVersionChecker(version) {
    var header = 'x-broker-api-version';
    console.log(version);
    return function(request, response, next) {
        if (request.headers[header]) {
            var pattern = new RegExp('^' + version.major + '\\.\\d+$');
            if (!request.headers[header].match(pattern)) {
                console.log('Incompatible services API version: ' + request.headers[header]);
                response.status(412);
                next(new restify.PreconditionFailedError('Incompatible services API version'));
            }
        } else {
            console.log(header + ' is missing from the request');
        }
        next();
    };
};

function authenticate(credentials) {
    return function(request, response, next) {
        if (credentials.authUser || credentials.authPassword) {
            if (!(request.authorization && request.authorization.basic && request.authorization.basic.username === credentials.authUser && request.authorization.basic.password === credentials.authPassword)) {
                response.status(401);
                response.setHeader('WWW-Authenticate', 'Basic "realm"="bare-bone-service-broker"');
                next(new restify.InvalidCredentialsError('Invalid username or password'));
            } else {
                // authenticated!
            }
        } else {
            // no authentication required.
        }
        next();
    };
};

server.get(/\/?.*/, restify.serveStatic({
    directory: './public',
    default: 'index.html'
}));

/** According to the spec, the JSON return message should include a description field. */
server.on('uncaughtException', function(req, res, route, err) {
    console.log(err, err.stack);
    //res.send(500, { 'code' : 500, 'description' : err.message});
});

checkConsistency();

var port = Number(process.env.VCAP_APP_PORT || 5001);
server.listen(port, function() {
    console.log('%s listening at %s', server.name, server.url)
});