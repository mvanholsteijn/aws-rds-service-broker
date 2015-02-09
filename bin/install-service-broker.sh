#!/bin/bash


function getRoutesUrl() {
	[ -z "$1" ] && echo ERROR: missing application name >&2 &&  exit 1

        stackato curl GET /v2/apps | grep -v ^SSL | \
		jq -r " .resources[] | select(.entity.name==\"$1\") | .entity.routes_url"
}


function getDomainUrlOfFirstRoute() {
	[ -z "$1" ] && echo ERROR: missing routes url >&2 &&  exit 1
	stackato curl GET $1 | grep -v ^SSL | jq -r '.resources[0].entity.domain_url'
}

function getHostOfFirstRoute() {
	[ -z "$1" ] && echo ERROR: missing routes url >&2 &&  exit 1
	stackato curl GET $1 | grep -v ^SSL | jq -r '.resources[0].entity.host'
}

function getDomainName() {
	[ -z "$1" ] && echo ERROR: missing domain url >&2 &&  exit 1
	stackato curl GET $1 | grep -v ^SSL | jq -r .entity.name
}

function getServicePlanUrlForUuid() {
	[ -z "$1" ] && echo ERROR: plan id is missing  >&2 &&  exit 1
	 stackato curl GET /v2/service_plans | grep -v ^SSL | \
		jq -r ".resources[] | select(.entity.unique_id == \"$1\") | .metadata.url "
}

function getFirstRoute() {
	ROUTES_URL=$(getRoutesUrl $1)
	DOMAIN_URL=$(getDomainUrlOfFirstRoute $ROUTES_URL)
	HOSTNAME=$(getHostOfFirstRoute $ROUTES_URL)
	DOMAIN=$(getDomainName $DOMAIN_URL)

	echo $HOSTNAME.$DOMAIN
}

function getPlanName() {
    jq -r ".catalog.services[] | select(.name==\"$2\") | .plans[] | select(.id==\"$3\") | .name" config/$1.json 
}
function makeAllPlansPublic() {
	SERVICES=$(jq -r ".catalog.services[] | .name"  config/$1.json)
	if [ -n "$SERVICES" ] ; then
		for SERVICE in $SERVICES; do
			PLANS=$(jq -r ".catalog.services[] | select(.name==\"$SERVICE\") | .plans[] | .id"  config/$1.json)
			if [ -n "$PLANS" ] ; then
				for PLAN in $PLANS ; do 
						SERVICEPLAN_URL=$(getServicePlanUrlForUuid $PLAN)
						PLAN_NAME=$(getPlanName $1 $SERVICE $PLAN)
						if [ -n "$SERVICEPLAN_URL" ] ; then
							echo "INFO: making plan '$PLAN_NAME' of service '$SERVICE' public" >&2
							stackato curl PUT $SERVICEPLAN_URL -d '{"public" : true }' > /dev/null
						else
							echo "ERROR: plan '$PLAN_NAME' of service '$SERVICE' is not registered." >&2
						fi
				done
			else
				echo "WARN: no plans found for service $SERVICE in config/$1.json" >&2
			fi
		done
	else
		echo "WARN: No services defined in config/$1.json" >&2
	fi
}

function checkServiceBroker() {
  stackato curl GET /v2/service_brokers | grep -v ^SSL | jq  -r ".resources[] | select(.entity.name==\"$1\") | .entity.name"
}

function checkAppExists() {
	stackato curl GET /v2/apps | grep -v ^SSL | \
	            jq -r " .resources[] | select(.entity.name==\"$1\") | .entity.name"
}
function installServiceBroker() {

	EXISTS=$(checkAppExists $1)
	if [ -z "$EXISTS" ] ; then
		stackato push $1
	else
		echo "WARN: $1 is already deployed. to update, just push!"
	fi

	USER=$(jq -r ".credentials.authUser" config/$1.json )
	PWD=$(jq -r ".credentials.authPassword" config/$1.json)

	if [ -z "$(checkServiceBroker $1)"  ] ; then
		stackato create-service-broker \
			--username $USER \
			--password $PWD \
			--url http://$(getFirstRoute $1) \
			$1
	else
		echo "WARN: a service broker named '$1' already exists." >&2
	fi
}

installServiceBroker aws-rds-service-broker
makeAllPlansPublic aws-rds-service-broker
