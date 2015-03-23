#!/bin/bash
USAGE="Usage: docurl.sh [-u username] [-c password ] curl-options"

while getopts "u:c:" opt; do
  case $opt in
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

curl --user $SERVICE_BROKER_USERNAME:$SERVICE_BROKER_PASSWORD $@


