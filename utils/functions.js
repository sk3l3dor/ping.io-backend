const axios = require('axios');
const crypto = require('crypto');

const API_ROOT = process.env.TNO_V1_API_ROOT;
const JWT_SECRET = process.env.TNO_V1_JWT_SECRET;

const TNO_OWNER_SMS_USERNAME = process.env.TNO_OWNER_MOBILE_ONE_USERNAME;
const TNO_OWNER_SMS_PASSWORD = process.env.TNO_OWNER_MOBILE_ONE_PASSWORD;
const TNO_OWNER_SMS_SENDER_ID = process.env.TNO_OWNER_MOBILE_ONE_SENDER_ID;
const TNO_OWNER_SMS_API_KEY = process.env.TNO_OWNER_MOBILE_ONE_API_KEY;
const TNO_OWNER_SMS_TEMPLATE_ID = process.env.TNO_OWNER_MOBILE_ONE_TEMPLATE_ID;



const generatePassword = () => {
    let length = 8, charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    return password;
}

const getThisEntityCount = async (entity) => {
    let tempEntity = entity.toUpperCase();
    
    try{
        const getCounterReq = await axios.get(`${API_ROOT}counter?entity=${tempEntity}`);
        console.log('getCounterReq : ',getCounterReq)
        return getCounterReq.data.count;
    }
    catch(error) {
        console.log(error);
        return false
    }
}

const updateThisEntityCount = async (entity) => {
    let tempEntity = entity.toUpperCase();

    try{
        const data = {
            entity: tempEntity,
            token: JWT_SECRET
        }

        const updateCounterReq = await axios.post(`${API_ROOT}counter`, data);
        return updateCounterReq.count;
    }
    catch(error) {
        //console.log(error);
        return false
    }
}

const saveTestReport = async (data, token) => {

    const config = {
        headers: {
            'Authorization': token
        }
    }

    try{
        const saveReportReq = await axios.post(`${API_ROOT}report`, data, config);
        return saveReportReq;
    }
    catch(error) {
        //console.log(error);
        return false
    }
}

const sendLoginValidationSMS = async (name, to, otp) => {
    
    const message = `Dear ${name},
${otp} is the OTP to login for Taluk Nodal Officer portal .
Regards, Centre for e-Governance - web portal
Govt of Karnataka`;

    const mobileno = to;

    const encryptedPassword = crypto.createHash('sha1').update(TNO_OWNER_SMS_PASSWORD.trim()).digest('hex');
    const generateHash = crypto.createHash('sha512').update(`${TNO_OWNER_SMS_USERNAME}${TNO_OWNER_SMS_SENDER_ID}${message}${TNO_OWNER_SMS_API_KEY}`).digest('hex');
    const sms_service_type = "otpmsg";

    const url_data = {
        username: TNO_OWNER_SMS_USERNAME.trim(),
        password: encryptedPassword.trim(),
        senderid: TNO_OWNER_SMS_SENDER_ID.trim(),
        content: message.trim(),
        smsservicetype: sms_service_type,
        mobileno: mobileno.trim(), 
        key: generateHash.trim(),
        templateid: TNO_OWNER_SMS_TEMPLATE_ID.trim()
    }

    const send_sms = await axios.post(`http://65.2.76.193/index.php/sendmsg`, url_data);
    return true
}

module.exports = {
    getThisEntityCount,
    updateThisEntityCount,
    saveTestReport,
    generatePassword,
    sendLoginValidationSMS
}