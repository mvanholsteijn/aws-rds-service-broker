# AWS RDS Service Broker
A configurable Cloud Foundry Service Broker, complying to version 2.4 of the interface specification
http://docs.cloudfoundry.org/services/api.html

* provision: The service broker will create a Amazon RDS database instance, parameters and password stored as tag with the instance
* bind: search for the specified service instance with a matching tag and return the credentials.
* unbind: does nothing.
* deprovision: search for the specified service instance with matching tag and deletes it.

The bind and unbind does not keep any registration. The service broker is stateless as it  does not store any
information on the local file system and is stateless. This means you can deploy multiple instances of the broker for HA purposes.

## config
The catalog of services and plans is defined in the file config/aws-rds-service-broker.json.

## security
when you create a broker, you need to specify the user name and password to use. You can specify the
credentials in the config.

```json
 "credentials": {
    "authUser": "demouser",
    "authPassword": "demopassword"
  }
```
The default is set to demouser + demopassword. best changed :-)

## Adding service broker services and plans
You can add new plans, by adding plan in a existing services config.  You can also add new services, by adding a service definition to the catalog (for instance an Oracle DB service) and at least one plan.

When you add a new plan, you must also also add a matching set of parameters for the creation of an instance
in the config plans. For instance:
```json
  "<your-uuid>": {
      "parameters" : {
        "DBInstanceIdentifier": "cfdb",
        "AllocatedStorage": 5,
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
You can configure a plan by setting parameters as defined in the SDK.
See http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/RDS.html#createDBInstance-property.

## DB Instance names
The 'DBInstanceIdentifier' is used a a prefix to generate a new dbinstance name. The suffix will be a dash, followed
by the timestamp of creation as a hexadecimal string.

## AWS Region and database subnet groups
The Region and subnet group to create the instances in is defined in the config.aws section.
```json
"aws": {
    "Region": "eu-central-1",
    "DBSubnetGroupName": "stackato-db-subnet-group"
  }
```
you must have created the DBSubnetGroup.

## AWS Access keys
Access to your AWS Acccount is obtained by specifying the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY as
environment variables. It is best to create a separate user for the service broker. 

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
