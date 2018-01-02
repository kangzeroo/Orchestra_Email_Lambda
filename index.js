const AWS = require('aws-sdk')
const s3 = new AWS.S3()
const simpleParser = require('mailparser').simpleParser
const generateForwardedEmail = require('./api/aws-ses').generateForwardedEmail
const getRelationshipFromId = require('./api/relationship_api').getRelationshipFromId
const saveEmailCommunicationsLog = require('./api/relationship_api').saveEmailCommunicationsLog

exports.handler = (event, context, callback) => {

    console.log(event.Records[0].ses)

    console.log('=========== CHECK IT OUT ==============')
    // console.log(event.Records[0].ses.mail.headers)
    // console.log(event.Records[0].ses.mail.commonHeaders.from)
    // console.log(event.Records[0].ses.mail.commonHeaders.to)

    let sender_id = ''                  // the tenant_id or corporation_id of the sender
    let sender_alias_email = ''         // the alias email of the sender (john@gmail.com --> john@renthero.cc)
    let receiver_id = ''                // the tenant_id or corporation_id of the receiver
    let receiver_actual_email = ''      // the actual email of the recipient (rent@kw4rent.com)

    let htmlEmailBody = ''              // the HTML of the email
    let sender_actual_email = ''        // the actual email of the sender (john@gmail.com)
    let subject = ''                    // the subject of the email
    let toEmailAddresses = []           // array of to: emails that the sender may have additionally included
    let ccEmailAddresses = []           // array of cc: emails that the sender may have additionally included
    let bccEmailAddresses = []          // array of bcc: emails that the sender may have additionally included
    let attachments = []                // array of attachments as BASE64. However, we currently cannot forward attachments, we must use ses.sendRawEmail()
    let plainHtmlEmailBody = ''         // the HTML of the email as string html. excludes extra stuff like embedded images

    // MUST DO THE FOLLOWING
      // 1. Receives an email object from Lambda with to, from, subject, messageId, but no Body
      const email_message_id = event.Records[0].ses.mail.messageId
      // 2. Queries S3 using the messageId to get the Email with Body
      extractFromS3(email_message_id)
        .then((mail) => {
          console.log('CHECKING -----')
          htmlEmailBody = mail.html
          sender_actual_email = mail.from.value[0].address
          subject = mail.subject ? mail.subject : ''
          toEmailAddresses = mail.to.value.filter((v) => v.address.indexOf('@renthero.cc') === -1).length > 0 ? mail.to.value.filter((v) => v.address.indexOf('@renthero.cc') === -1)[0].address : []
          ccEmailAddresses = mail.cc ? mail.cc.value.map((v) => v.address) : []
          bccEmailAddresses = mail.bcc ? mail.bcc.value.map((v) => v.address) : []
          attachments = mail.attachments ? mail.attachments : []
          plainHtmlEmailBody = mail.textAsHtml

          const receiverAliasEmail = mail.to.value.filter((v) => v.address.indexOf('@renthero.cc') > -1)[0].address
          const receiver_alias_email = receiverAliasEmail.split('@')[0]

          // 3. Using the proxy id (RelationshipID), we hit a backend route (SMS_Communications_Microservice) to query Postgres to get the tenant_email and landlord_email
          return getRelationshipFromId(receiver_alias_email, sender_actual_email)
        })
        .then((data) => {
          /*
            data = {
              tenant_id,
              tenant_email,
              tenant_alias_email,
              landlord_id,
              landlord_email,
              landlord_alias_email,
            }
          */
          sender_id = determineWhosWho(data, sender_actual_email).sender_id
          sender_alias_email = determineWhosWho(data, sender_actual_email).sender_alias_email
          receiver_id = determineWhosWho(data, sender_actual_email).receiver_id
          receiver_actual_email = determineToAddress(data, sender_actual_email)
          toEmailAddresses.push(receiver_actual_email)
          bccEmailAddresses.push('email.records.rentburrow@gmail.com')
          // 4. Use AWS SES to send the forwarded email to the appropriate receipient, again with the RelationshipID as the from email (from: RelationshipID@renthero.cc)
          return generateForwardedEmail(
            { toEmailAddresses, ccEmailAddresses, bccEmailAddresses, proxyEmailAddress: sender_alias_email },
            { subject, attachments },
            htmlEmailBody
          )
        })
        .then((data) => {
            console.log('SUCCESSFULLY FORWARDED EMAIL')
            // 5. Save the message to Communications Log by hitting another backend route (SMS_Communications_Microservice)
            return saveEmailCommunicationsLog({
              proxy_email: sender_alias_email,
              sender_id: sender_id,
              receiver_id: receiver_id,
              sender_email: sender_alias_email,
              receiver_email: receiver_actual_email,
              plainHtmlEmailBody,
            })
            callback(null, 'Finished forwarding email')
        })
        .catch((err) => {
          console.log(err)
          callback(err)
        })
};

const extractFromS3 = (id) => {
  const p =  new Promise((res, rej) => {
    const params = {
     Bucket: 'renthero-email-logs',
     Key: `orchestra/${id}`,
    }
   s3.getObject(params, (err, S3Object) => {
  	    if (err) {
	      	console.log(err)
	      	return
  	    }
  			console.log('============== START =============')
  			const emailBody = S3Object.Body.toString('utf-8')

        // console.log(emailBody)
        simpleParser(emailBody)
          .then((mail)=>{
            console.log('mail.subject')
            console.log(mail.subject)
            console.log('mail.to')
            console.log(mail.to)
            console.log('mail.from')
            console.log(mail.from)
            console.log('mail.cc')
            console.log(mail.cc)
            console.log('mail.bcc')
            console.log(mail.bcc)
            console.log('mail.inReplyTo')
            console.log(mail.inReplyTo)
            console.log('mail.attachments')
            console.log(mail.attachments)
            console.log('mail.html')
            console.log(mail.html)
            console.log()
            res(mail)
          })
          .catch((err) => {
            console.log('============== simpleParser ==============')
            console.log(err)
            rej(err)
          })
  	})
  })
  return p
}

const determineToAddress = ({ tenant_email, landlord_email }, sender_actual_email) => {
  if (tenant_email === sender_actual_email) {
    return landlord_email
  } else if (landlord_email === sender_actual_email) {
    return tenant_email
  } else {
    // case where a different email tries to contact this recipient
    return 'support@rentburrow.com'
  }
}

const determineWhosWho = ({ tenant_email, landlord_email, tenant_id, landlord_id, tenant_alias_email, landlord_alias_email }, sender_actual_email) => {
  if (tenant_email === sender_actual_email) {
    return {
      sender_id: tenant_id,
      sender_alias_email: tenant_alias_email,
      receiver_id: landlord_id,
      receiver_alias_email: landlord_alias_email,
    }
  } else if (landlord_email === sender_actual_email) {
    return {
      sender_id: landlord_id,
      sender_alias_email: landlord_alias_email,
      receiver_id: tenant_id,
      receiver_alias_email: tenant_alias_email,
    }
  } else {
    // case where a different email tries to contact this recipient
    return {
      sender_id: 'support@rentburrow.com',
      sender_alias_email: 'support@rentburrow.com',
      receiver_id: 'support@rentburrow.com',
      receiver_alias_email: 'support@rentburrow.com',
    }
  }
}
