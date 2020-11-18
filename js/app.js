/* global $ OT SAMPLE_SERVER_BASE_URL */

var apiKey;
var sessionId;
var token;
var archiveID;
var session;
var currentVideoSource;
var layout;

const RED = '#f44336';
const GREEN = '#4CAF50';

// As soon as the page loads, call this
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

function initializeSession() {

    // Get session 
    session = OT.initSession(apiKey, sessionId);
    layout = setupFeatures();
    // Initialize session event listners
    sessionEventListners(session, layout);

    // Initialize the publisher and publish
    publishToStreamInitial(session);

    currentVideoSource = 'camera';

}

function publishToStreamInitial(session) {
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

    // Connect to the session and publish
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
}

function publishToStream(session, videoType) {

    var publisherOptions;

    // Initialise publisher
    if (videoType === 'camera') {
        publisherOptions = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        };
        currentVideoSource = 'camera';
    } else {
        publisherOptions = {
            videoSource: 'screen'
        };
        currentVideoSource = 'screen';
    }

    var publisher = OT.initPublisher('publisher', publisherOptions, function initCallback(initErr) {
        if (initErr) {
            console.error('There was an error initializing the publisher: ', initErr.name, initErr.message);
            return;
        } else {
            session.publish(publisher, function(error) {
                if (error) {
                    console.error('There was an error publishing: ', error.name, error.message);
                }
            })
        }
    });
}

function setupFeatures() {
    const layoutContainer = document.getElementById('layout');

    const options = {
        maxRatio: 3 / 2,
        minRatio: 9 / 16,
        fixedRatio: false,
        bigMaxRatio: 3 / 2,
        bigMinRatio: 9 / 16,
        bigFirst: true,
        animate: true,
        animateDuration: 200,
        animateEasing: "swing",
        window,
    };

    // Initialize the layout container and get a reference to the layout method
    var layout = initLayoutContainer(layoutContainer, options);
    return layout;
}

function sessionEventListners(session, layout) {

    // Whenever anything changes on the publisher's end, 'streamCreated' event is called
    session.on('streamCreated', function streamCreated(event) {

        var subscriberOptions = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        };

        if (event.stream.videoType === 'screen')
            subscriberOptions.insertMode = 'replace'

        session.subscribe(event.stream, 'subscriber', subscriberOptions, function callback(error) {
            if (error) {
                console.log('There was an error publishing: ', error.name, error.message);
            }
        });

        layout.layout();

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
        contentType: 'application/json',
        data: JSON.stringify({ 'sessionId': sessionId }),

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
function toggleTextChat() {

    var textBox = document.getElementById('textchat');
    var videos = document.getElementById('videos');

    var textChatButton = document.getElementById('textChatButton');

    if (textBox.style.display === 'none' || textBox.style.display === '') {
        textBox.style.display = 'block';
        textChatButton.style.backgroundColor = RED;
        videos.style.width = '80%';
        layout.layout();

    } else {
        textBox.style.display = 'none';
        textChatButton.style.backgroundColor = GREEN;
        videos.style.width = '100%';
        layout.layout();
    }

}
// Send a signal once the user enters data in the form
form.addEventListener('submit', function submit(event) {
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
function toggleScreenSharing() {

    // Initialise the session event listners
    sessionEventListners(session);

    var screenShareButton = document.getElementById('screenShare');

    // If currentVideoSource is Camera, share the screen else share camera again
    if (currentVideoSource === 'camera') {

        screenShareButton.style.backgroundColor = RED;
        OT.checkScreenSharingCapability(function(response) {
            if (!response.supported || response.extensionRegistered === false) {
                // This browser does not support screen sharing.
            } else if (response.extensionInstalled === false) {
                // Prompt to install the extension.
            } else {

                publishToStream(session, 'screen');
            }
        });
    } else {
        screenShareButton.style.backgroundColor = GREEN;
        publishToStream(session, 'camera');
    }

}

// Toggle publisher
function togglePublisher() {
    var pub = document.getElementById('publisher');
    var pubButton = document.getElementById('Publisher');

    if (pub.style.display === 'none') {
        pub.style.display = 'block';
        pubButton.style.backgroundColor = GREEN;
        pub.style.backgroundColor = '#FFFFFF';
    } else {
        pub.style.display = 'none';
        pubButton.style.backgroundColor = RED;
        pub.style.backgroundColor = '#7FFF00';
    }

}