#!/bin/bash
USAGE="Usage: list.sh [-h service-broker-url] "

HOST=127.0.0.1:5001

while getopts ":h:" opt; do
  case $opt in
    h)
	HOST=$OPTARG
	;;
    \?) 
      echo $USAGE >&2 
      echo "Invalid option: -$OPTARG" >&2
      exit 1
      ;;
  esac
done

USER=$(jq -r ".credentials.authUser" config/aws-rds-service-broker.json)
PWD=$(jq -r ".credentials.authPassword" config/aws-rds-service-broker.json)

curl -X GET http://$USER:$PWD@$HOST/v2/service_instances
