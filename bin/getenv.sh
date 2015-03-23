#!/bin/bash
 if [ $# -ne 1 ] ; then
	echo "USAGE: getenv.sh app-name" >&2
	exit 1
fi

stackato curl GET /v2/apps | \
	jq -r ".resources[] | select (.entity.name == \"$1\") |  .entity.environment_json | to_entries  | .[] | [ .key, ( .value | @sh) ] | join(\"=\")"
