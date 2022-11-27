const express = require('express')
const { faker } = require('@faker-js/faker')

const app = express()
const port = 3000
app.use(express.json());

const fields = [ 'name', 'sex', 'dob', 'married', 'jobTitle', 'address', 'company', 'email']
  
let profilesArray = [];

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

const authCredentials = {
  username: faker.internet.userName(),
  password: faker.internet.password()
}
/** Basic Auth Checker */
async function basicAuth(req, res, next) {
 
  if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
      return res.status(401).json({ message: 'Missing Authorization Header' });
  }

  const base64Credentials =  req.headers.authorization.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');
  
  if (username !== authCredentials.username || password !== authCredentials.password) {
      return res.status(401).json({ message: 'Invalid Authentication Credentials' });
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

app.get('/v1/authentication', (req, res) => {
  res.send({data: authCredentials})
})

app.get('/v1/employees/unsecure', (req, res) => {
  res.send({data: profilesArray})
})

app.get('/v1/employees/secure', basicAuth, (req, res) => {
  res.send({data: profilesArray})
})

app.post('/v1/employee', (req, res) => {
  console.log(req.body)
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

app.put('/v1/employee/:id', (req, res) => {
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
    response = { error: `Missing fields ${validate}` , code : 400} 
  }
  res.status(isEmpty(response.code) ? 200 : response.code).send({ data: response})
})

app.get('/v1/employee/:id', (req, res) => {
  if(req.params.id < 0 || req.params.id >= profilesArray.length) {
    res.status(404).send({ data: {'code': 404, 'message': 'record does not exist'}})
    return
  }
  res.send({data: profilesArray.at(req.params.id)})
})

app.patch('/v1/employee/:id', (req, res) => {
  const empId = req.params.id
  if(req.params.id < 0 || req.params.id >= profilesArray.length) {
    res.status(404).send({ data: {'code': 404, 'message': 'record does not exist'}})
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

app.delete('/v1/employee/:id', (req, res) => {
  const empId = req.params.id
  if(req.params.id < 0 || req.params.id >= profilesArray.length) {
    res.status(404).send({'code':404, 'message': 'record does not exist'})
    return
  }
  profilesArray.splice(empId, 1);
  res.status(204).send({})
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})