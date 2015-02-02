#!/bin/bash
USAGE="Usage: unbind.sh [-h service-broker-url]  -i instance-id -b binding-id"

HOST=127.0.0.1:5001

while getopts ":h:i:b:" opt; do
  case $opt in
    h)
	HOST=$OPTARG
	;;
    i)
	INSTANCE_ID=$OPTARG
      ;;
    b)
	BINDING_ID=$OPTARG
	;;
    \?) 
      echo $USAGE >&2 
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
  esac
done

if [ -z "$INSTANCE_ID" ] ; then
	echo $USAGE >&2
	echo ERROR: missing service id >&2
	exit 1;
fi

if [ -z "$BINDING_ID" ] ; then
	echo $USAGE >&2
	echo ERROR: missing binding id >&2
	exit 1;
fi

USER=$(cat config/aws-rds-service-broker.json | jq -r ".credentials.authUser")
PWD=$(cat config/aws-rds-service-broker.json | jq -r ".credentials.authPassword")

curl http://$USER:$PWD@$HOST/v2/service_instances/$INSTANCE_ID/service_bindings/$BINDING_ID \
	 -H "Content-Type: application/json" \
	-X DELETE \
	--data '{
  "service_id":        "i do not care",
  "plan_id":           "i do not care",
  "app_guid": "app-guid-here"
}'
