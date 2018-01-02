# Orchestra Email Lambda
This is a lambda function that takes an incoming email from AWS SES and forwards it to the appropriate recipient.<br/>
First lets look at the email forwarding at a high level context before diving step-by-step on how this lambda function works.<br/>

## Email Forwarding Overview
Tenants and Landlords on RentHero all are assigned an alias_email upon registration. It looks like this:<br/>
- johnsmith@gmail.com --> johnsmith-43A8GD@renthero.cc
- rent@kw4rent.com --> kw4rent@renthero.cc
When tenants and landlords interact on RentHero, they always see the email_alias and never see the real email. As a result, a tenant sending an email looks like this to the lambda function: <br/><br/>

----- INCOMING EMAIL ----- <br/>
To: kw4rent@renthero.cc <br/>
From: johnsmith@gmail.com <br/>
Body: 'Hello is this place still available?' <br/>
-------------------------- <br/><br/>

And the lambda converts and sends this email out to the landlord, who receives it looking like this: <br/><br/>

----- OUTGOING CONVERTED EMAIL ----- <br/>
To: rent@kw4rent.com <br/>
From: johnsmith-43A8GD@renthero.cc <br/>
Body: 'Hello is this place still available?' <br/>
-------------------------- <br/><br/>

This process and go back and forth as well as include other people in CC or BCC, operating smoothly as if there were no middleman. Currently this lambda function does not support forwarding of attachments. <br/><br/>

Every email that gets forwarded by the lambda function is also saved to S3 and logged in DynamoDB.

## Step-by-Step Process
1. Receive incoming email from SES and grabs the messageId assigned by SES
2. Using the messageId, we grab the saved email from S3 (previously saved as part of the AWS SES Ruleset for our email domain)
3. Parse the saved email from MIME into a readable JS format
4. Using the real FROM address and the alias TO address of the original email, we grab the alias FROM address for the new forwarded email (hits a backend microservice)
5. Send out the forwarded email that now appears to come from the alias FORM address (xxxx@renthero.cc)
6. Logs the communication to DynamoDB (hits a backend microservice)

### Limitations
- Currently this lambda function cannot forward attachments in emails. To do so, we must switch from ses.sendEmail() to ses.sendRawEmail()
- If the backend microservice IP address changes, we must manually change it in this lambda function and redeploy
