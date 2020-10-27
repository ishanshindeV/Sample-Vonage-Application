/* global $ OT SAMPLE_SERVER_BASE_URL */

var apiKey;
var sessionId;
var token;
var archiveID;
var session;

$(document).ready(function ready() {
  $('#stop').hide();
  archiveID = null;

  // Make an Ajax request to get the OpenTok API key, session ID, and token from the server
  $.get(SAMPLE_SERVER_BASE_URL + '/session', function get(res) {
    apiKey = res.apiKey;
    sessionId = res.sessionId;
    token = res.token;

    initializeSession();
  });
});

function initializeSession() 
{
  session = OT.initSession(apiKey, sessionId);

  // Subscribe to a newly created stream
  session.on('streamCreated', function streamCreated(event) {
    var subscriberOptions = {
      insertMode: 'append',
      width: '100%',
      height: '100%'
    };
    session.subscribe(event.stream, 'subscriber', subscriberOptions, function callback(error) {
      if (error) {
        console.log('There was an error publishing: ', error.name, error.message);
      }
    });
  });

  session.on('archiveStarted', function archiveStarted(event) {
    archiveID = event.id;
    console.log('Archive started ' + archiveID);
    $('#stop').show();
    $('#start').hide();
  });

  session.on('archiveStopped', function archiveStopped(event) {
    archiveID = event.id;
    console.log('Archive stopped ' + archiveID);
    $('#start').hide();
    $('#stop').hide();
    $('#view').show();
  });

  session.on('sessionDisconnected', function sessionDisconnected(event) {
    console.log('You were disconnected from the session.', event.reason);
  });

  // Initialize the publisher
  var publisherOptions = {
    insertMode: 'append',
    width: '100%',
    height: '100%'
  };
  var publisher = OT.initPublisher('publisher', publisherOptions, function initCallback(initErr) {
    if (initErr) {
      console.error('There was an error initializing the publisher: ', initErr.name, initErr.message);
      return;
    }
  });

  // Connect to the session
  session.connect(token, function callback(error) {
    // If the connection is successful, initialize a publisher and publish to the session
    if (!error) {
      // If the connection is successful, publish the publisher to the session
      session.publish(publisher, function publishCallback(publishErr) {
        if (publishErr) {
          console.error('There was an error publishing: ', publishErr.name, publishErr.message);
        }
      });
    } else {
      console.error('There was an error connecting to the session: ', error.name, error.message);
    }
  });

  // Receive a message and append it to the history
  var msgHistory = document.querySelector('#history');
  session.on('signal:msg', function signalCallback(event) {
    var msg = document.createElement('p');
    msg.textContent = event.data;
    msg.className = event.from.connectionId === session.connection.connectionId ? 'mine' : 'theirs';
    msgHistory.appendChild(msg);
    msg.scrollIntoView();
  });

  
}

// FOR ARCHIVING
// Start recording
function startArchive() { // eslint-disable-line no-unused-vars
  $.ajax({
    url: SAMPLE_SERVER_BASE_URL + '/archive/start',
    type: 'POST',
    headers:{'Access-Control-Allow-Origin': '*'},
    contentType: 'application/json', // send as JSON
    data: JSON.stringify({'sessionId': sessionId}),

    complete: function complete() {
      // called when complete
      console.log('startArchive() complete');
    },

    success: function success() {
      // called when successful
      console.log('successfully called startArchive()');
    },

    error: function error() {
      // called when there is an error
      console.log('error calling startArchive()');
    }
  });

  $('#start').hide();
  $('#stop').show();
}

// Stop recording
function stopArchive() { // eslint-disable-line no-unused-vars
  $.post(SAMPLE_SERVER_BASE_URL + '/archive/' + archiveID + '/stop');
  $('#stop').hide();
  $('#view').prop('disabled', false);
  $('#stop').show();
}

// Get the archive status. If it is  "available", download it. Otherwise, keep checking
// every 5 secs until it is "available"
function viewArchive() { // eslint-disable-line no-unused-vars
  $('#view').prop('disabled', true);
  window.location = SAMPLE_SERVER_BASE_URL + /archive/ + archiveID + '/view';
}

$('#start').show();
$('#view').hide();

// FOR TEXT CHAT
var form = document.querySelector('form');
var msgTxt = document.querySelector('#msgTxt');

// Button for Toggling Text Chat Window
function toggleTextChat()
{
  var textBox = document.getElementById('textchat');
  if (textBox.style.display === 'none')
    textBox.style.display = 'block';
  else
    textBox.style.display = 'none';
}
// Send a signal once the user enters data in the form
form.addEventListener('submit', function submit(event) 
{
  event.preventDefault();

  session.signal({
    type: 'msg',
    data: msgTxt.value
  }, function signalCallback(error) {
    if (error) {
      console.error('Error sending signal:', error.name, error.message);
    } else {
      msgTxt.value = '';
    }
  });
});

// For screen sharing
function startScreenSharing()
{
  initializeSession();
  OT.checkScreenSharingCapability(function(response) {
    if(!response.supported || response.extensionRegistered === false) {
      // This browser does not support screen sharing.
    } else if (response.extensionInstalled === false) {
      // Prompt to install the extension.
    } else {
      // Screen sharing is available. Publish the screen.
      var publisher = OT.initPublisher('publisher',
        {videoSource: 'screen'},
        function(error) {
          if (error) {
            // Look at error.message to see what went wrong.
          } else {
            session.publish(publisher, function(error) {
              if (error) {
                // Look error.message to see what went wrong.
              }
            });
          }
        }
      );
    }
  });
}


