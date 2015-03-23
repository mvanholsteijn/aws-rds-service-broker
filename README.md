# AWS RDS Service Broker
A configurable Cloud Foundry Service Broker, complying to version 2.4 of the interface specification
:quy

* provision: The service broker will create a Amazon RDS database instance, parameters and password stored as tag with the instance
* bind: search for the specified service instance with a matching tag and return the credentials.
* unbind: does nothing.
* deprovision: search for the specified service instance with matching tag and deletes it.

The bind and unbind does not keep any registration. The service broker is stateless as it  does not store any
information on the local file system and is stateless. This means you can deploy multiple instances of the broker for HA purposes.

This service broker was tested on Stackato.

## config
The catalog of services and plans is defined in the file config/aws-rds-service-broker.json.

## security
when you create a broker in Cloud Foundy, you need to specify the user name and password to use. The credentials 
are specified as environment variables

```bash
SERVICE_BROKER_USERNAME=demouser
SERVICE_BROKER_PASSWORD=demopassword
```

## AWS Region and database subnet groups
You must specify the Region and create a AWS RDS database subnet group in that region in which  the database instances should be created.
These are specified by the environment variables

```bash
AWS_REGION=eu-central-1
AWS_DBSUBNET_GROUP_NAME=stackato-db-subnet-group
```

## AWS Access keys
Access to your AWS Acccount is obtained by specifying the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as
environment variables. It is best to create a separate user for the service broker with limited permissions


## Required AWS Permissions
The service broker requires the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rds:AddTagsToResource",
        "rds:CreateDBInstance",
        "rds:DeleteDBInstance",
        "rds:DescribeDBInstances",
        "rds:ListTagsForResource"
      ],
      "Resource": [
        "*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:GetUser"
      ],
      "Resource": [
        "*"
      ]
    }
  ]
}
```

## Adding service broker services and plans
You can add new plans to an existing service, or you can add a completely new service definition to the configuration (for instance an Oracle DB service).

When you add a new plan, you must also also add a matching set of parameters for the creation of an instance
in the plans element of the configuration. For instance:
```json
  "<your-uuid>": {
      "parameters" : {
        "DBInstanceIdentifier": "cfdb",
        "AllocatedStorage": 100,
        "DBInstanceClass": "db.t2.micro",
        "Engine": "MySQL",
        "MasterUsername": "root",
        "AutoMinorVersionUpgrade": true,
        "BackupRetentionPeriod": 5,
        "DBName": "mydb",
        "StorageType": "gp2",
        "PubliclyAccessible": false
      },
      "urlTemplate" :  "mysql://{{host}}:{{port}}/{{database}}?user={{username}}&password={{password}}"
```
You can use any of the  parameters as defined in the SDK for the createDBInstance method.
See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/RDS.html#createDBInstance-property.

## DB Instance names
The 'DBInstanceIdentifier' is used a a prefix to generate a new dbinstance name. The suffix will be a dash, followed
by the timestamp of creation as a hexadecimal string.

