#!/bin/bash
USAGE="Usage: list.sh [-h service-broker-url] "

HOST=127.0.0.1:5001

while getopts ":h:u:c:" opt; do
  case $opt in
    h)
	HOST=$OPTARG
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

if [ -z "$SERVICE_BROKER_USERNAME" -o -z "$SERVICE_BROKER_PASSWORD" ] ; then
	echo $USAGE >&2
	echo ERROR: missing SERVICE_BROKER_USERNAME or SERVICE_BROKER_PASSWORD >&2
	exit 1;
fi

curl -s -H 'x-broker-api-version: 2.4' -X GET http://$SERVICE_BROKER_USERNAME:$SERVICE_BROKER_PASSWORD@$HOST/v2/catalog
