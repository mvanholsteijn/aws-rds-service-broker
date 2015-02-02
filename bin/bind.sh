#!/bin/bash
USAGE="Usage: bind.sh [-h service-broker-url]  -i service-instance-id [-b binding-id]"

HOST=127.0.0.1:5001
BINDING_ID=$(uuidgen)

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
	echo ERROR: missing instance id >&2
	exit 1;
fi

USER=$(jq -r ".credentials.authUser" config/aws-rds-service-broker.json)
PWD=$(jq -r ".credentials.authPassword" config/aws-rds-service-broker.json)

curl http://$USER:$PWD@$HOST/v2/service_instances/$INSTANCE_ID/service_bindings/$BINDING_ID \
	 -H "Content-Type: application/json" \
	-X PUT \
	--data '{
  "service_id":        "i do not care",
  "plan_id":           "i do not care",
  "app_guid": 		"app-guid-here"
}'
