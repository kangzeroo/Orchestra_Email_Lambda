const axios = require('axios')

const ANALYTICS_MICROSERVICE = 'https://rentburrow.com:3006'

exports.getRelationshipFromId = function(receiver_alias_email, sender_actual_email){
  console.log('=========== getRelationshipFromId =============')
  console.log(receiver_alias_email)
  console.log(sender_actual_email)
  const p = new Promise((res, rej) => {
    axios.post(`${ANALYTICS_MICROSERVICE}/email_relationship`, { receiver_alias_email, sender_actual_email })
      .then((data) => {
        res(data.data)
      })
      .catch((err) => {
        rej(err)
      })
  })
  return p
}

exports.saveEmailCommunicationsLog = function(log){
  const p = new Promise((res, rej) => {
    axios.post(`${ANALYTICS_MICROSERVICE}/save_email_communications_log`, log)
      .then((data) => {
        res(data.data)
      })
      .catch((err) => {
        rej(err)
      })
  })
  return p
}
