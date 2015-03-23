#!/bin/bash
USAGE="Usage: provision.sh [-h service-broker-url] -s service-name -p plan-name [-i instance-id] [-u username] [-c password]"

HOST=127.0.0.1:5001
INSTANCE_ID=$(uuidgen)

while getopts ":h:s:p:i:u:c:" opt; do
  case $opt in
    h)
	HOST=$OPTARG
	;;
    s)
	SERVICE_NAME=$OPTARG
	;;
    p)
	PLAN_NAME=$OPTARG
	;;
    i)
	INSTANCE_ID=$OPTARG
      ;;
    u)
	SERVICE_BROKER_USERNAME=$OPTARG
	;;
    c)
	SERVICE_BROKER_PASSWORD=$OPTARG
	;;
    \?) 
      echo $USAGE >&2 
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
  esac
done

SERVICE_ID=$(cat config/aws-rds-service-broker.json  | jq -r ".catalog.services[] | select(.name==\"$SERVICE_NAME\") | .id")
if [ -z "$SERVICE_NAME" -o -z "$SERVICE_ID" ] ; then
	echo "$USAGE" >&2
	echo ERROR: missing or incorrect service name. choose of one $(cat config/aws-rds-service-broker.json  | jq -r '.catalog.services[] | .name') >&2
	exit 1;
fi


PLAN_ID=$(cat config/aws-rds-service-broker.json  | jq -r ".catalog.services[] | select(.name==\"$SERVICE_NAME\") | .plans[] | select(.name==\"$PLAN_NAME\") | .id")
if [ -z "$PLAN_NAME" -o  -z "$PLAN_ID" ] ; then
	echo ERROR: missing or incorrect plan name. choose of one $(cat config/aws-rds-service-broker.json  | jq -r ".catalog.services[] | select(.name==\"$SERVICE_NAME\") | .plans[] | .name") >&2
	exit 1;
fi

if [ -z "$SERVICE_BROKER_USERNAME" -o -z "$SERVICE_BROKER_PASSWORD" ] ; then
	echo $USAGE >&2
	echo ERROR: missing SERVICE_BROKER_USERNAME or SERVICE_BROKER_PASSWORD >&2
	exit 1;
fi

curl -s -H 'x-broker-api-version: 2.4' http://$SERVICE_BROKER_USERNAME:$SERVICE_BROKER_PASSWORD@$HOST/v2/service_instances/$INSTANCE_ID \
	 -H "Content-Type: application/json" \
	-X PUT \
	--data "{
  \"service_id\":        \"$SERVICE_ID\",
  \"plan_id\": 		\"$PLAN_ID\",
  \"organization_guid\": \"org-guid-here\",
  \"space_guid\":        \"space-guid-here\"
}"
