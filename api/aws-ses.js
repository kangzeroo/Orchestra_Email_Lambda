// AWS SES (Simple Email Service) for sending emails via Amazon
const AWS_SES = require('aws-sdk/clients/ses')
const AWS = require('aws-sdk')
const ses = new AWS_SES({
  region: 'us-east-1'
})

// CURRENTLY UNABLE TO FOWARD EMAIL ATTACHMENTS
exports.generateForwardedEmail = function(
  { toEmailAddresses, ccEmailAddresses, bccEmailAddresses, proxyEmailAddress },
  { subject, attachments },
  htmlEmailBody
){
  /*
    toEmailAddresses = ['personA@email.com', 'personB@email.com']
    ccEmailAddresses = ['personA@email.com', 'personB@email.com']
    bccEmailAddresses = ['personA@email.com', 'personB@email.com']
    proxyEmailAddress = 'relationshipID@renthero.cc',
    subject = 'RentHero Inquiry'
    htmlEmailBody = <div>This is the email body</div>
  */

	const p = new Promise((res, rej) => {
		if (!toEmailAddresses || toEmailAddresses.length === 0 || !proxyEmailAddress || !htmlEmailBody) {
			rej('Missing to email, proxy email or message')
		} else {
			const params = createParams(
        { toEmailAddresses, ccEmailAddresses, bccEmailAddresses, proxyEmailAddress },
        { subject, attachments },
        htmlEmailBody
      )
			// console.log('Sending email with attached params!')
			AWS.config.credentials.refresh(function() {
				// console.log(AWS.config.credentials)
				ses.sendEmail(params, function(err, data) {
				  if (err) {
              console.log('=========== generateForwardedEmail ===========')
				  	 console.log(err); // an error occurred
				  	 rej(err)
				  } else {
				  	console.log(data);           // successful response
  					res({
              message: 'Success! Email sent',
              data: data
            })
				  }
				})
			})
		}
	})
	return p
}

// setup for AWS SES config
function createParams(
  { toEmailAddresses, ccEmailAddresses, bccEmailAddresses, proxyEmailAddress },
  { subject, attachments },
  htmlEmailBody
){
	const params = {
	  Destination: { /* required */
	    BccAddresses: bccEmailAddresses,
	    CcAddresses: ccEmailAddresses,
	    ToAddresses: toEmailAddresses
	  },
	  Message: { /* required */
	    Body: { /* required */
	      Html: {
	        Data: htmlEmailBody,
	        Charset: 'UTF-8'
	      },
	    },
	    Subject: { /* required */
	      Data: subject, /* required */
	      Charset: 'UTF-8'
	    }
	  },
	  Source: proxyEmailAddress, /* required */
	  // ConfigurationSetName: 'STRING_VALUE',
	  ReplyToAddresses: [
	      proxyEmailAddress
	  ],
	  ReturnPath: proxyEmailAddress,
	  // ReturnPathArn: 'STRING_VALUE',
	  // SourceArn: 'STRING_VALUE',
	}
	return params
}
