/**
 * Created by mark on 02/02/15.
 */

'use strict';

var config = require('./config/aws-rds-service-broker');
var Handlebars = require('handlebars');
var async = require('async');
var aws = require('aws-sdk');
var restify = require('restify');
aws.config.region = config.aws.Region;
var rds = new aws.RDS();
var iam = new aws.IAM();
var server = restify.createServer({ name: 'aws-rds-service-broker' });

server.use(apiVersionChecker("2.3"));
server.use(restify.authorizationParser());
server.use(authenticate(config.credentials));
server.use(restify.fullResponse());
server.use(restify.bodyParser());
server.pre(restify.pre.userAgentConnection());



server.get('/v2/catalog', function (request, response, next) {
    var catalog = null;

    function checkConsistency() {
        var i, p, msg, plans;

        try {
            catalog = config.catalog;
            plans = config.plans;

            for (i = 0; i < catalog.services.length; i += 1) {
                for (p = 0; p < catalog.services[i].plans.length; p += 1) {
                    if (!plans.hasOwnProperty(catalog.services[i].plans[p].id)) {
                        msg = "ERROR: plan '" + catalog.services[i].plans[p].name + "' of service '" + catalog.services[i].name + "' is missing a specification.";
                    }
                }
            }
        } catch (err) {
            console.log(err, err.stack);
            msg = err;
        } finally {
            if (msg) {
                response.send(500, { 'description' : msg});
                next();
            }
        }
    }

    checkConsistency();
    response.send(config.catalog);
    next();
});


server.put('/v2/service_instances/:id', function(request, response, next) {
    if (config.plans.hasOwnProperty(request.params.plan_id)) {
        createRds(request, response, next, config.plans[request.params.plan_id]);
    } else {
        response.send(500, { 'description' : "plan " + request.params.plan_id + " is missing in the service broker configuration." });
        next();
    }
});

server.del('/v2/service_instances/:id', function(req, response, next) {
    getAllDbInstances(new DbInstanceIdFilter(req.params.id), function (err, allMatchingInstances) {
        var instance, params;

        if (!err && allMatchingInstances && allMatchingInstances.length > 0) {
            instance = allMatchingInstances[0];
            params = {
                DBInstanceIdentifier: instance.DBInstanceIdentifier
            };

            if (instance.DBInstanceStatus !== "creating") {
                params.FinalDBSnapshotIdentifier = ('Final-snapshot-' + instance.DBInstanceIdentifier);
                params.SkipFinalSnapshot = false;
            } else {
                params.SkipFinalSnapshot = true;
            }

            rds.deleteDBInstance(params, function (err, rdsResponse) {
                if (!err) {
                    response.send({});
                } else {
                    response.send(500, {'description' : err});
                    console.log(err);
                }
            });
        } else {
            if (!err) {
                response.send(410,{'description' : "instance no longer exists"} );
            } else {
                response.send(500, {'description' : err});
                console.log(err);
            }
        }
        next();
    });
});

server.get('/v2/service_instances', function(request, response, next) {
    getAllDbInstances(new DbInstanceNoFilter(), function (err, allDatabaseInstances) {
        if(!err) {
            response.send(allDatabaseInstances);
        } else {
            response.send(500, err);
        }
        next();
    });
});

server.put('/v2/service_instances/:instance_id/service_bindings/:id', function(req, response, next) {
    var reply = {};

    getAllDbInstances(new DbInstanceIdFilter(req.params.instance_id), function (err, allDatabaseInstances) {
        var i = 0, instance = null, tag = null;

        if (!err) {
            if (allDatabaseInstances && allDatabaseInstances.length > 0) {
                instance = allDatabaseInstances[0];
                if (instance && instance.Endpoint) {
                    reply.credentials = {
                        'host': instance.Endpoint.Address,
                        'username': instance.MasterUsername,
                        'port': instance.Endpoint.Port
                    };
                    for (i = 0; i < instance.TagList.length; i += 1) {
                        tag = instance.TagList[i];
                        if (tag.Key === 'CF-AWS-PASSWORD') {
                            reply.credentials.password = tag.Value;
                        }
                    }
                    response.send(reply);
                } else {
                    response.send(500, { 'description' : "No endpoint set on the instance '" + instance.DBInstanceIdentifier + "'. The instance is in state '" + instance.DBInstanceStatus + "'."});
                }
            } else {
                response.send(500, { 'description' : 'database instance has been deleted.'});
            }
        } else {
            response.send(500, { 'description' : err });
        }
        next();
    });
});

server.del('/v2/service_instances/:instance_id/service_bindings/:id', function(req, response, next) {
    response.send({});
    next();
});


function generatePassword(passwordLength) {
    var i = 0,
        result = "",
        possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (i = 0; i < passwordLength; i += 1) {
        result += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return result;
}


function getAllDbInstances(filter, functionCallback) {
    var RdsArnPrefix = null,
        AwsAccountId = null,
        dbInstances = [];

    function addTagsToDBInstances(dbinstance, callback) {
        rds.listTagsForResource({
                'ResourceName': RdsArnPrefix + dbinstance.DBInstanceIdentifier
            },
            function (err, tags) {
                if (err) {
                    callback(err, null);
                } else {
                    if (tags) {
                        dbinstance.TagList = tags.TagList;
                    } else {
                        dbinstance.TagList = [];
                    }
                    callback(null, dbinstance);
                }
            });
    }

    async.series([
            // Get AwsAccountId and RdsArnPrefix
            function (callback) {
                iam.getUser({}, function (err, data) {
                    var user = data.User,
                        colon = new RegExp(":");
                    if (err) {
                        callback(err, []);
                    } else {
                        AwsAccountId = user.Arn.split(colon)[4];
                        RdsArnPrefix = 'arn:aws:rds:' + config.aws.Region + ':' + AwsAccountId + ':db:';
                        callback(null, user);
                    }
                });
            },

            // Get All RdsInstances
            function (callback) {
                var i = 0;

                rds.describeDBInstances({}).eachPage(function (err, page, done) {
                    if (err) {
                        callback(err, null);
                    } else if (page) {
                        if (page.DBInstances && page.DBInstances.length > 0) {
                            async.mapLimit(page.DBInstances, 2, addTagsToDBInstances, function (err, results) {
                                if (err) {
                                    callback(err, null);
                                } else {
                                    filter.filter(results, function (err, matches) {
                                        if (err) {
                                            callback(err, null);
                                        } else {
                                            for (i = 0; i < matches.length; i += 1) {
                                                dbInstances.push(matches[i]);
                                            }
                                            done();
                                        }
                                    });
                                }
                            });
                        } else {
                            done();
                        }
                    } else {
                        callback(null, dbInstances);
                    }
                });
            }
        ],
        function (err) {
            functionCallback(err, dbInstances);
        });
}

// filter to match on service instance id
function DbInstanceIdFilter(id) {
    this.filter = function (dbinstances, callback) {
        function matchInstanceIdTag(tag, callback) {
            callback(tag.Key === 'CF-AWS-RDS-INSTANCE-ID' && tag.Value === id);
        }

        function match(instance, callback) {
            async.filter(instance.TagList, matchInstanceIdTag, function (resultingArray) {
                callback(resultingArray.length > 0);
            });
        }

        async.filter(dbinstances, match, function (matchingDbInstances) {
            callback(null, matchingDbInstances);
        });
    };
}

// filter to select all of the  dbinstances
function DbInstanceNoFilter() {
    this.filter = function (dbinstances, callback) {

        function match(instance, callback) {
            var i, tag, serviceMatch = false,
                planMatch = false,
                orgMatch = false,
                spaceMatch = false;

            for (i = 0; i < instance.TagList.length; i += 1) {
                tag = instance.TagList[i];
                serviceMatch = serviceMatch || (tag.Key === 'CF-AWS-RDS-SERVICE-ID');
                planMatch = planMatch || (tag.Key === 'CF-AWS-RDS-PLAN-ID');
                orgMatch = orgMatch || (tag.Key === 'CF-AWS-RDS-ORG-ID');
                spaceMatch = spaceMatch || (tag.Key === 'CF-AWS-RDS-SPACE-ID');
            }
            callback(serviceMatch && planMatch && orgMatch && spaceMatch);
        }

        async.filter(dbinstances, match, function (matchingDbInstances) {
            callback(null, matchingDbInstances);
        });
    };
}

// filter to select all of dbinstances matching service, plan, organization and space.
function DbInstanceParameterFilter(params) {
    this.service_id = params.service_id;
    this.plan_id = params.plan_id;
    this.organization_guid = params.organization_guid;
    this.space_guid = params.space_guid;

    this.filter = function (dbinstances, callback) {

        function match(instance, callback) {
            var i, tag, serviceMatch = false,
                planMatch = false,
                orgMatch = false,
                spaceMatch = false;

            for (i = 0; i < instance.TagList.length; i += 1) {
                tag = instance.TagList[i];
                serviceMatch = serviceMatch || (tag.Key === 'CF-AWS-RDS-SERVICE-ID' && tag.Value === params.service_id);
                planMatch = planMatch || (tag.Key === 'CF-AWS-RDS-PLAN-ID' && tag.Value === params.plan_id);
                orgMatch = orgMatch || (tag.Key === 'CF-AWS-RDS-ORG-ID' && tag.Value === params.organization_guid);
                spaceMatch = spaceMatch || (tag.Key === 'CF-AWS-RDS-SPACE-ID' && tag.Value === params.space_guid);
            }
            callback(serviceMatch && planMatch && orgMatch && spaceMatch);
        }

        async.filter(dbinstances, match, function (matchingDbInstances) {
            callback(null, matchingDbInstances);
        });
    };
}


function generateInstanceId(prefix) {
    return prefix.concat('-').concat((Math.floor(Date.now() / 100).toString(16)));
}

function createDashboardUrl(params) {
    var dashboardUrl = Handlebars.compile('https://{{region}}.console.aws.amazon.com/rds/home?region={{region}}#dbinstance:id={{id}}');
    return {
        dashboard_url: dashboardUrl({
            region: aws.config.region,
            id: params.DBInstanceIdentifier
        })
    };
}

function createRds(request, response, next, plan) {
    var reply = {}, params = null;

    params = JSON.parse(JSON.stringify(plan));
    params.DBInstanceIdentifier = generateInstanceId(plan.DBInstanceIdentifier);
    params.MasterUserPassword = generatePassword(12);
    params.DBSubnetGroupName = config.aws.DBSubnetGroupName;

    params.Tags = [{
        'Key': 'CF-AWS-RDS-SERVICE-ID',
        'Value': request.params.service_id
    }, {
        'Key': 'CF-AWS-RDS-PLAN-ID',
        'Value': request.params.plan_id
    }, {
        'Key': 'CF-AWS-RDS-ORG-ID',
        'Value': request.params.organization_guid
    }, {
        'Key': 'CF-AWS-RDS-SPACE-ID',
        'Value': request.params.space_guid
    }, {
        'Key': 'CF-AWS-PASSWORD',
        'Value': params.MasterUserPassword
    }, {
        'Key': 'CF-AWS-RDS-INSTANCE-ID',
        'Value': request.params.id
    }];

    getAllDbInstances(new DbInstanceIdFilter(request.params.id), function (err, dbInstances) {
        if (!err) {
            if (dbInstances && dbInstances.length > 0) {
                response.send(409, {});
                next();
            } else {
                rds.createDBInstance(params, function (err) {
                    if (!err) {
                        reply = createDashboardUrl(params);
                        response.send(reply);
                        next();
                    } else {
                        response.send(500, { 'description' : err });
                        next();
                    }
                });
            }
        } else {
            response.send(500, { 'description' : err });
            next();
        }
    });
}

function apiVersionChecker (version) {
    var header = 'x-broker-api-version';
    console.log(version);
    return function (request, response, next) {
        console.log("version checker");
        if (!request.headers[header]) {
            console.log(header + ' is missing from the request');
        } else {
            var pattern = new RegExp('^' + version.major + '\\.\\d+$');
            if (!request.headers[header].match(pattern)) {
                console.log('Incompatible services API version: ' + request.headers[header]);
                response.status(412);
                response.end();
            }
        }
        next();
    };
};

function authenticate(credentials) {
    return function (request, response, next) {
        if (credentials.authUser || credentials.authPassword) {
            if (request.authorization && request.authorization.basic && request.authorization.basic.username === credentials.authUser && request.authorization.basic.password === credentials.authPassword) {
                return next();
            } else {
                console.log('Error: authorization denied');
                response.status(401);
                response.setHeader('Connection', 'close');
                response.end();
                return next(new restify.NotAuthorizedError());
            }
        } else {
            return next();
        }
    };
};

server.listen(5001, function () {
    console.log('%s listening at %s', server.name, server.url)
});

