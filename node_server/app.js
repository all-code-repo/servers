const express = require('express')
const { faker } = require('@faker-js/faker')
const { application, json } = require('express')

const app = express()
const port = 3000

app.get('/v1/employees', (req, res) => {
  let response = [];
  for(let i=0; i < 10; i++) {
    response.push({
      'name': faker.name.fullName(),
      'sex': faker.name.sex(),
      'dob': faker.date.birthdate(),
      'married': faker.datatype.boolean(),
      'jobTitle': faker.name.jobTitle(),
      'address': faker.address.city(),
      'company': faker.company.name(),
      'email': faker.internet.email()
    })
  } 
  res.send({data: response})
})
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})