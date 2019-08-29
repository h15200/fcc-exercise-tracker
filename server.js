const express = require('express')
const mongoose = require('mongoose')
const mongo = require('mongodb')
const cors = require('cors')
const app = express()
const objectId = mongoose.Types.ObjectId
const moment = require('moment')

process.env.MLAB_URI = 'mongodb+srv://h15200:Fcc-atlas2@cluster0-iur4j.mongodb.net/test?retryWrites=true&w=majority'
                   
 mongoose.connect(process.env.MLAB_URI , {
   useNewUrlParser: true
 }).then((data) => {
      console.log('connection established with db')
 })
 .catch(error => {
   console.log('error connecting to mongo', error)
 })

app.use(cors())

// to use the built-in parser
app.use(express.urlencoded({ extended: true }))

const userSchema = new mongoose.Schema({
username: {
    type: String,
    required: true
  },
  
  exercises:{
    type: Array,
    default: []
  }
})

const User = mongoose.connection.model('User', userSchema)

// serve the html file in public for root
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// user story 1
app.post('/api/exercise/new-user', (req, res) => {
  console.log(req.body.username)
  User.findOne({username: req.body.username}).then(data => {
    if (data === null){ // if user does not exist
    new User({username: req.body.username}).save().then(data =>{
      return res.json({
        username: req.body.username,
        id: data._id
                      })
    }).catch(error =>{
      console.log('Problem saving new user', error)
    })
    }
    else {
      return res.send('Username already taken!')
    }
  }).catch(error => {
    console.log('Problem searching', error)
  })
})

//user story 2 
app.get('/api/exercise/users', (req, res)=> {
  console.log(req.query.username)
  if (req.query.username) { // if proper query string,
    User.find({username: req.query.username}).then(data => {
      if (data.length===0){ // if no user with name
        return res.send(`No user named '${req.query.username}'`)
      }
      return res.json(data)
    }).catch(error =>{
      console.log('error finding users', error)
    })
  }
})

//user story 3
app.post('/api/exercise/add', (req, res)=>{
  // since FINDING by objectId will crash when the string is not appropriate, check first
  if (!objectId.isValid(req.body.userId)){
    return res.send('ID not valid')
  }
    // here id is the proper length
  
// date Object validator so date isn't recorded as "not valid date"
  const isValidDate = d => d instanceof Date && !isNaN(d)
  let date
  if ((isValidDate(new Date(req.body.date)))){
    date = new Date(req.body.date)
  }
  else{
    date = new Date()
  }

  User.findOneAndUpdate({_id: objectId(req.body.userId)},{
    $push: {exercises: {
      description: req.body.description ,
      duration:  req.body.duration ,
      date: moment(date).format('ddd MMM D YYYY')
      }     
    }
  }).then(data=>{
    if (data ===null){ //proper length, but does not exist
      return res.send('ID not found')
    }
    // id match
   
    if ((isValidDate(new Date(req.body.date)))){
    date = new Date(req.body.date)
  }
  else{
    date = new Date()
  }
    
    return res.json({
      username: data.username,
      description: req.body.description,
      duration: req.body.duration,
      _id: req.body.userId,
      date: moment(date).format('ddd MMM D YYYY')
    })
  })
.catch(error => {
    console.log('Error in searching and retrieving Data', error)
  })
})
  
// User Story 4 and 5
app.get('/api/exercise/log',(req,res)=>{
   if (!objectId.isValid(req.query.userId)){
    return res.send('ID not valid')
  }
  // id is valid here
 console.log('id valid, about to search for it now')
  User.findById(objectId(req.query.userId))
    .then(data=>{
    if (data === null){
      console.log('data is null, does not exist in db')
      return res.send('ID not in database')
    }
   // id is valid and available here
    
    //first sort by date by "biggest"moment, most recent to older
   let logData = data.exercises.sort((a,b)=>{
     return moment(b.date) - moment(a.date)
    })
    console.log(logData) // sorted by most recent
    
      // if req.query.limit or from or to, assign logData
    // using if instead of else if so all 3 can be used
    
    if (req.query.from){  
      logData = logData.filter(item => moment(req.query.from) < moment(item.date))
        }
    if (req.query.to){
       logData = logData.filter(item => moment(req.query.to) > moment(item.date))
    }
    if (req.query.limit){
      logData = logData.slice(0,req.query.limit)
    }
    
    res.json({
      _id: data._id,
      username: data.username,
      from: req.query.from,
      to: req.query.to,
      count:logData.length,
      log: logData
    })
  }).catch(error=>{
  console.log(error)
  })
})

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
