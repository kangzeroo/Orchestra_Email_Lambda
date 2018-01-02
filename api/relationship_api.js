const axios = require('axios')

const ANALYTICS_MICROSERVICE = 'https://34.227.117.38:3007'

exports.getRelationshipFromId = function(receiver_alias_email, sender_actual_email){
  const p = new Promise((res, rej) => {
    // axios.post(`${ANALYTICS_MICROSERVICE}/email_relationship`, { receiver_alias_email, sender_actual_email })
    //   .then((data) => {
    //     res(data.data)
    //   })
    //   .catch((err) => {
    //     rej(err)
    //   })
    res({
      tenant_id: '0000000',
      tenant_email: 'huang.khan74@gmail.com',
      tenant_alias_email: 'huang.khan.38jkdfg8@renthero.cc',
      landlord_id: '1111111',
      landlord_email: 'support@rentburrow.com',
      landlord_alias_email: 'kw4rent@renthero.cc',
    })
  })
  return p
}

exports.saveEmailCommunicationsLog = function(log){
  const p = new Promise((res, rej) => {
    // axios.post(`${ANALYTICS_MICROSERVICE}/save_email_communications_log`, log)
    //   .then((data) => {
    //     res(data.data)
    //   })
    //   .catch((err) => {
    //     rej(err)
    //   })
    res()
  })
  return p
}
