/*
 * Copyright 2017-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with
 * the License. A copy of the License is located at
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions
 * and limitations under the License.
 *
 * Changes:
 * Kept imports and declarations. Changed the rest.
 */
const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const uuid = require('node-uuid');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');

// declare a new express app
const app = express();
app.use(awsServerlessExpressMiddleware.eventContext({ deleteHeaders: false }), bodyParser.json());

const PROFILE_DATA_TABLE_NAME = `${process.env.MOBILE_HUB_DYNAMIC_PREFIX}-profileData`;

AWS.config.update({ region: process.env.REGION });

const UNAUTH = 'UNAUTH';

// The DocumentClient class allows us to interact with DynamoDB using normal objects.
// Documentation for the class is available here: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html
const dynamoDb = new AWS.DynamoDB.DocumentClient();

app.get('/userData', (req, res) => {
  // performs a DynamoDB Query operation to extract all records for the cognitoIdentityId in the table
  dynamoDb.query({
    TableName: PROFILE_DATA_TABLE_NAME,
    KeyConditions: {
      userId: {
        ComparisonOperator: 'EQ',
        AttributeValueList: [req.apiGateway.event.requestContext.identity.cognitoIdentityId || UNAUTH],
      },
    },
  }, (err, data) => {
    if (err) {
      console.log(err);
      res.status(500).json({
        message: 'Could not load',
      }).end();
    } else {
      res.json(data.Items).end();
    }
  });
});

app.post('/userData/test', (req, res) => {
  const user = {};
  dynamoDb.put({
    TableName: PROFILE_DATA_TABLE_NAME,
    Item: {
        "userId": '001'
        }
  }, (err, data) => {
    if (err) {
      console.log(err)
      res.status(500).json({
        message: 'Test: database put operation failed',
        tableName: PROFILE_DATA_TABLE_NAME
      }).end();
    } else {
      res.json(user);
    }
  });

});

app.post('/userData', (req, res) => {
  // creates user object from request body to store into dynamoDb
  const user = Object.assign({}, req.body);
  Object.keys(user).forEach(key => (user[key] === '' && delete user[key]));
  user.userId = req.apiGateway.event.requestContext.identity.cognitoIdentityId;

  if (!user.userId) {
    res.status(400).json({
      message: 'Invalid User',
    }).end();
    return;
  }

  dynamoDb.put({
    TableName: PROFILE_DATA_TABLE_NAME,
    Item: user,
  }, (err, data) => {
    if (err) {
      console.log(err)
      res.status(500).json({
        message: 'Valid user but database put operation failed'
      }).end();
    } else {
      res.json(user);
    }
  });
});

app.listen(3000, function () {
  console.log('App started');
});

module.exports = app;
