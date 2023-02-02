const express = require('express')
const { faker } = require('@faker-js/faker')
const {
	ReasonPhrases,
	StatusCodes
} = require('http-status-codes');
const cron = require("node-cron"); 
const bodyParser = require('body-parser')

const app = express()
app.use(express.json());

let maintainceDownTime = false;
let profilesArray = [];
let authCredentials = {};

const port = 3000
const fields = [ 'name', 'sex', 'dob', 'married', 'jobTitle', 'address', 'company', 'email']
  

const resetProfilesArray = () => {
  console.info('reseting profiles array')
  profilesArray = [];
  for(let i=0; i < 500; i++) {
    profilesArray.push({
      'name': faker.name.fullName(),
      'sex': faker.name.sex(),
      'dob': faker.date.birthdate(),
      'married': faker.datatype.boolean(),
      'jobTitle': faker.name.jobTitle(),
      'address': faker.address.city(),
      'company': faker.company.name(),
      'email': faker.internet.email(),
    })
  }  
}

const resetAuthCredential = () => {
  console.info('reseting auth credentials')
  authCredentials = {
    username: faker.internet.userName(),
    password: faker.internet.password()
  };
}

resetProfilesArray();
resetAuthCredential();

/** MiddleWares */
async function requestInfoMiddleware(req, res, next) {
  console.info(Object.keys(req.route.methods), req.route.path);
  next();
}

async function isAppUnderMaintainence(req, res, next) {
  if(maintainceDownTime) {
    res.status(StatusCodes.SERVICE_UNAVAILABLE).send({error: ReasonPhrases.SERVICE_UNAVAILABLE})
    return
  }
  next();
}

/** Basic Auth Checker */
async function basicAuth(req, res, next) {
 
  if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Missing Authorization Header' });
  }

  const base64Credentials =  req.headers.authorization.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  if (username !== authCredentials.username || password !== authCredentials.password) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid Authentication Credentials' });
  }
  req.user = username;
  next();
}

function isEmpty(val){
  return (val === undefined || val == null || val.length <= 0) ? true : false;
}

const validateFields = function(o, required_fields) {
  let missingFields = []
  required_fields.forEach(field => {
    if(o.hasOwnProperty(field) || !isEmpty(o.field)) {
      console.log(`object contains ${field}`)
    } else {
      missingFields.push(field)
    }
  })
  return missingFields
}

cron.schedule("0 * * * *", function () {
  console.info(`Running cron for resetng ${Date()}`)
  resetProfilesArray();
  resetAuthCredential();
});

/** Endpoints */
app.get('/v1/authentication', isAppUnderMaintainence, (req, res) => {
  res.send({data: authCredentials})
})

app.get('/v1/employees', isAppUnderMaintainence, (req, res) => {
  res.send({data: profilesArray})
})


app.get('/v1/employees/secure', isAppUnderMaintainence, basicAuth, (req, res) => {
  res.send({data: profilesArray})
})

app.get('/v1/employee/:id', isAppUnderMaintainence, (req, res) => {
  if(req.params.id < 0 || req.params.id >= profilesArray.length) {
    res.status(StatusCodes.NOT_FOUND).send({ data: {'code': StatusCodes.NOT_FOUND, 'message': 'record does not exist'}})
    return
  }
  res.send({data: profilesArray.at(req.params.id)})
})


app.post('/v1/employee', isAppUnderMaintainence, requestInfoMiddleware, (req, res) => {
  if(profilesArray.length > 750 ) {
    res.status(StatusCodes.INSUFFICIENT_STORAGE).send({error: ReasonPhrases.INSUFFICIENT_STORAGE})
    return
  }
  const profile = req.body
  let response = {}
  const validate = validateFields(profile, fields)
  if( validate.length == 0) {
    profilesArray.push(profile)
    response = { 'id': profilesArray.length - 1 , code : 201 }
  } else { 
    response = { error: `Missing fields ${validate}` , code : 400} 
  }
  res.status(response.code).send({ data: response})
})

app.put('/v1/employee/:id', isAppUnderMaintainence, requestInfoMiddleware, (req, res) => {
  const empId = req.params.id
  const profile = req.body
  let response = {}
  const validate = validateFields(profile, fields)
  if( validate.length == 0) {
    for (key in profilesArray[empId]) { 
      profilesArray[key]=profile[key];
   }
    response = { 'id': empId , ...profile}
  } else { 
    response = { error: `Missing fields ${validate}` , code : StatusCodes.BAD_REQUEST} 
  }
  res.status(isEmpty(response.code) ? StatusCodes.OK : response.code).send({ data: response})
})



app.patch('/v1/employee/:id', isAppUnderMaintainence, requestInfoMiddleware, (req, res) => {
  const empId = req.params.id
  if(req.params.id < 0 || req.params.id >= profilesArray.length) {
    res.status(StatusCodes.NOT_FOUND).send({ data: {'code': StatusCodes.NOT_FOUND, 'message': 'record does not exist'}})
    return
  }
  const patchRequest = req.body;
  fields.forEach(field => {
    if(!isEmpty(patchRequest[field])) {
      profilesArray.at(empId)[field] = patchRequest[field]
    }
  })
  res.send({data: profilesArray.at(req.params.id)})
})

app.delete('/v1/employee/:id', isAppUnderMaintainence, requestInfoMiddleware, (req, res) => {
  const empId = req.params.id
  if(req.params.id < 0 || req.params.id >= profilesArray.length) {
    res.status(StatusCodes.NOT_FOUND).send({'code': StatusCodes.NOT_FOUND, 'message': 'record does not exist'})
    return
  }
  profilesArray.splice(empId, 1);
  res.status(StatusCodes.NO_CONTENT).send({})
})

app.post('/v1/maintainence', (req, res) => {
  // TO DO secure with password 
  maintainceDownTime = !maintainceDownTime
  res.status(StatusCodes.OK).send({'undermaintainence': maintainceDownTime})
})

app.post('/v1/reset', (req, res) => {
  // TO DO secure with password 
  maintainceDownTime = false
  resetAuthCredential();
  resetProfilesArray();
  res.status(StatusCodes.NO_CONTENT).send({})
})

app.get('/', isAppUnderMaintainence, requestInfoMiddleware, (req, res) => {
  console.log(req)
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})