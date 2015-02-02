#!/bin/bash
USAGE="Usage: provision.sh [-h service-broker-url] -s service-name -p plan-name [-i instance-id]"

HOST=127.0.0.1:5001
INSTANCE_ID=$(uuidgen)

while getopts ":h:s:p:i:" opt; do
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

USER=$(cat config/aws-rds-service-broker.json | jq -r ".credentials.authUser")
PWD=$(cat config/aws-rds-service-broker.json | jq -r ".credentials.authPassword")

curl http://$USER:$PWD@$HOST/v2/service_instances/$INSTANCE_ID \
	 -H "Content-Type: application/json" \
	-X PUT \
	--data "{
  \"service_id\":        \"$SERVICE_ID\",
  \"plan_id\": 		\"$PLAN_ID\",
  \"organization_guid\": \"org-guid-here\",
  \"space_guid\":        \"space-guid-here\"
}"
