#!/bin/bash
USAGE="Usage: docurl.sh curl options"

USER=$(jq -r ".credentials.authUser" config/aws-rds-service-broker.json)
PWD=$(jq -r ".credentials.authPassword" config/aws-rds-service-broker.json)

curl --user $USER:$PWD $@


