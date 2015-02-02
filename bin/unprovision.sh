#!/bin/bash
USAGE="Usage: unprovision.sh [-h service-broker-url]  -i instance-id"

HOST=127.0.0.1:5001

while getopts ":h:i:" opt; do
  case $opt in
    h)
	HOST=$OPTARG
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

if [ -z "$INSTANCE_ID" ] ; then
	echo $USAGE >&2
	echo ERROR: missing uuid >&2
	exit 1;
fi

USER=$(cat config/aws-rds-service-broker.json | jq -r ".credentials.authUser")
PWD=$(cat config/aws-rds-service-broker.json | jq -r ".credentials.authPassword")

curl http://$USER:$PWD@$HOST/v2/service_instances/$INSTANCE_ID \
	 -H "Content-Type: application/json" \
	-X DELETE \
	--data '{
  "service_id":        "i do not care",
  "plan_id":           "i do not care"
}'
