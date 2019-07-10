// Environment Variables
// **********
// UTC_OFFSET - Minutes offset to output times to voice from UTC
// API_KEY - Google API key that can be used to query Google Calendar
// CALENDAR_URI - URI of the Google Calendar to query, must be publicly readable
// VOICE_NAME - Nexmo voice to use for text-to-spech
// PORT - The port the application should listen on

const express = require('express');
const moment = require('moment');
const { google } = require('googleapis');

const app = express();
const port = process.env.PORT || 3000;

const voiceName = process.env.VOICE_NAME || "Amy";
const utcOffset = parseInt(process.env.UTC_OFFSET) || -240;
const calendarUri = process.env.CALENDAR_URI
const apiKey = process.env.API_KEY

const cal = google.calendar({
    version: 'v3',
    auth: apiKey
});

app.get('/', (req, res) => {
  res.redirect('/answer')
})

app.post('/event', (req, res) => {
  res.json({ok: true}); // status 200 is default
})

app.get('/answer', (req, res) => {
  var time = new Date();

  getCurrentEvent(time).then((result) => {
    res.json(buildResponse(time, result));      
  }).catch(error => {
    console.log(error)
    res.json(buildErrorResponse(error));
  })

})

function getCurrentEvent(time, callback){
  var timeMin = new Date();
  timeMin.setHours(0,0,0);

  var timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + 1);
  timeMax.setHours(0,0,0);

  return cal.events.list({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    singleEvents: true,
    calendarId: calendarUri
  })
}

function buildResponse(time, result){
  var event = parseEventResponse(time, result);
  var ncco = []

  if(event){
    var startTime = moment(event.start.dateTime);
    var endTime = moment(event.end.dateTime);

    ncco.push({
      action: "talk",
      voiceName: voiceName,
      text: "Welcome to the business hours demo app!"
    })
    ncco.push({
      action: "talk",
      voiceName: voiceName,
      text: "Our business hours today are from " + startTime.utcOffset(utcOffset).format("LT") + " to " + endTime.utcOffset(utcOffset).format("LT")
    })
  } else {
    ncco.push({
      action: "talk",
      voiceName: voiceName,
      text: "We are current closed."
    })
  }

  return ncco;
}

function parseEventResponse(time, result){
  for (let item of result.data.items) {
    var startTime = moment(item.start.dateTime);
    var endTime = moment(item.end.dateTime);

    if(startTime.toDate() <= time && endTime.toDate() > time){
      console.log("Found current event: " + item.id)
      return item;
    }
  } 
  console.log("Unable to find current event")
  return null;
}

function buildErrorResponse(error){
  return [{
    action: "talk",
    voiceName: voiceName,
    text: "An error occurred connecting to your calendar"
  }]
}

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
