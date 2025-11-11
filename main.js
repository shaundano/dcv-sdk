//
// By Ni SP GmbH // www.ni-sp.com // Use at own risk
//
// http://www.ni-sp.com/DCVSDK/

import "./dcvjs/dcv.js"
import { CONFIGTEACHER, CONFIGSTUDENT } from './config.js'


let auth,
    connection,
    serverUrl,
    selectedConfig;

console.log("Using NICE DCV Web Client SDK version " + dcv.version.versionStr);
// Show launch button on page load
document.addEventListener('DOMContentLoaded', showLaunchPrompt);

// -----------------------------------------------------------------
// MEDIA PERMISSIONS COMPONENT
// -----------------------------------------------------------------

function createMediaPermissionsComponent() {
    const container = document.createElement('div');
    container.style.cssText = 'margin: 25px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Media Permissions';
    title.style.cssText = 'margin: 0 0 15px 0; color: #333; font-size: 18px; font-weight: 500;';
    container.appendChild(title);
    
    // Status indicators
    const statusContainer = document.createElement('div');
    statusContainer.style.cssText = 'margin: 15px 0; display: flex; flex-direction: column; gap: 12px;';
    
    const webcamStatus = document.createElement('div');
    webcamStatus.id = 'pre-webcam-status';
    webcamStatus.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border-radius: 6px; border: 1px solid #ddd;';
    
    const micStatus = document.createElement('div');
    micStatus.id = 'pre-mic-status';
    micStatus.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border-radius: 6px; border: 1px solid #ddd;';
    
    // Webcam status
    const webcamLabel = document.createElement('span');
    webcamLabel.textContent = 'Webcam:';
    webcamLabel.style.cssText = 'font-weight: 500; color: #333;';
    
    const webcamIndicator = document.createElement('span');
    webcamIndicator.id = 'pre-webcam-indicator';
    webcamIndicator.textContent = 'Not Enabled';
    webcamIndicator.style.cssText = 'color: #d9534f; font-weight: bold;';
    
    webcamStatus.appendChild(webcamLabel);
    webcamStatus.appendChild(webcamIndicator);
    
    // Mic status
    const micLabel = document.createElement('span');
    micLabel.textContent = 'Microphone:';
    micLabel.style.cssText = 'font-weight: 500; color: #333;';
    
    const micIndicator = document.createElement('span');
    micIndicator.id = 'pre-mic-indicator';
    micIndicator.textContent = 'Not Enabled';
    micIndicator.style.cssText = 'color: #d9534f; font-weight: bold;';
    
    micStatus.appendChild(micLabel);
    micStatus.appendChild(micIndicator);
    
    statusContainer.appendChild(webcamStatus);
    statusContainer.appendChild(micStatus);
    
    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = 'display: flex; gap: 10px; justify-content: center; margin-top: 15px;';
    
    const enableWebcamBtn = document.createElement('button');
    enableWebcamBtn.id = 'pre-enable-webcam';
    enableWebcamBtn.textContent = 'Enable Webcam';
    enableWebcamBtn.style.cssText = `
        padding: 10px 20px;
        font-size: 14px;
        background: #5cb85c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
    `;
    enableWebcamBtn.onmouseover = () => {
        if (!enableWebcamBtn.disabled) {
            enableWebcamBtn.style.background = '#4cae4c';
        }
    };
    enableWebcamBtn.onmouseout = () => {
        if (!enableWebcamBtn.disabled) {
            enableWebcamBtn.style.background = '#5cb85c';
        }
    };
    
    const enableMicBtn = document.createElement('button');
    enableMicBtn.id = 'pre-enable-mic';
    enableMicBtn.textContent = 'Enable Microphone';
    enableMicBtn.style.cssText = `
        padding: 10px 20px;
        font-size: 14px;
        background: #5cb85c;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
    `;
    enableMicBtn.onmouseover = () => {
        if (!enableMicBtn.disabled) {
            enableMicBtn.style.background = '#4cae4c';
        }
    };
    enableMicBtn.onmouseout = () => {
        if (!enableMicBtn.disabled) {
            enableMicBtn.style.background = '#5cb85c';
        }
    };
    
    buttonsContainer.appendChild(enableWebcamBtn);
    buttonsContainer.appendChild(enableMicBtn);
    
    container.appendChild(statusContainer);
    container.appendChild(buttonsContainer);
    
    // State tracking
    let webcamEnabled = false;
    let micEnabled = false;
    let webcamStream = null;
    let micStream = null;
    let onStatusChangeCallback = null;
    
    function updateStatusCallback() {
        if (onStatusChangeCallback) {
            onStatusChangeCallback();
        }
    }
    
    function verifyWebcam(stream) {
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0 && videoTracks[0].readyState === 'live') {
            webcamEnabled = true;
            webcamIndicator.textContent = 'Enabled';
            webcamIndicator.style.color = '#5cb85c';
            enableWebcamBtn.textContent = 'Webcam Enabled';
            enableWebcamBtn.disabled = true;
            enableWebcamBtn.style.background = '#5cb85c';
            updateStatusCallback();
            return true;
        }
        return false;
    }
    
    function verifyMicrophone(stream) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].readyState === 'live') {
            micEnabled = true;
            micIndicator.textContent = 'Enabled';
            micIndicator.style.color = '#5cb85c';
            enableMicBtn.textContent = 'Microphone Enabled';
            enableMicBtn.disabled = true;
            enableMicBtn.style.background = '#5cb85c';
            updateStatusCallback();
            return true;
        }
        return false;
    }
    
    // Enable webcam handler
    enableWebcamBtn.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        enableWebcamBtn.disabled = true;
        enableWebcamBtn.textContent = 'Enabling...';
        webcamIndicator.textContent = 'Enabling...';
        webcamIndicator.style.color = '#ffa500';
        
        try {
            // Stop existing stream if any
            if (webcamStream) {
                webcamStream.getTracks().forEach(track => track.stop());
            }
            
            // Request webcam permission
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            webcamStream = stream;
            
            if (verifyWebcam(stream)) {
                // Stop the stream after verification to free resources
                // The permission is now granted, DCV will use it when connecting
                setTimeout(() => {
                    stream.getTracks().forEach(track => track.stop());
                    webcamStream = null;
                }, 1000);
            } else {
                throw new Error('Webcam track not available');
            }
        } catch (e) {
            console.error("Failed to enable webcam:", e.message);
            enableWebcamBtn.disabled = false;
            enableWebcamBtn.textContent = 'Enable Webcam';
            webcamIndicator.textContent = 'Not Enabled';
            webcamIndicator.style.color = '#d9534f';
            alert('Failed to enable webcam. Please check your browser permissions and ensure a webcam is connected.');
        }
    };
    
    // Enable mic handler
    enableMicBtn.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        enableMicBtn.disabled = true;
        enableMicBtn.textContent = 'Enabling...';
        micIndicator.textContent = 'Enabling...';
        micIndicator.style.color = '#ffa500';
        
        try {
            // Stop existing stream if any
            if (micStream) {
                micStream.getTracks().forEach(track => track.stop());
            }
            
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            micStream = stream;
            
            if (verifyMicrophone(stream)) {
                // Stop the stream after verification to free resources
                // The permission is now granted, DCV will use it when connecting
                setTimeout(() => {
                    stream.getTracks().forEach(track => track.stop());
                    micStream = null;
                }, 1000);
            } else {
                throw new Error('Microphone track not available');
            }
        } catch (e) {
            console.error("Failed to enable microphone:", e.message);
            enableMicBtn.disabled = false;
            enableMicBtn.textContent = 'Enable Microphone';
            micIndicator.textContent = 'Not Enabled';
            micIndicator.style.color = '#d9534f';
            alert('Failed to enable microphone. Please check your browser permissions and ensure a microphone is connected.');
        }
    };
    
    return {
        container,
        get webcamEnabled() { return webcamEnabled; },
        get micEnabled() { return micEnabled; },
        set onStatusChange(callback) { onStatusChangeCallback = callback; }
    };
}

function showLaunchPrompt () {
    // Create container for the selection UI
    const container = document.createElement('div');
    container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 10000; text-align: center; min-width: 300px;';
    
    // Title
    const title = document.createElement('h2');
    title.textContent = 'Select Role';
    title.style.cssText = 'margin: 0 0 20px 0; color: #333; font-size: 24px;';
    container.appendChild(title);
    
    // Radio button container
    const radioContainer = document.createElement('div');
    radioContainer.style.cssText = 'display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;';
    
    // Student radio
    const studentLabel = document.createElement('label');
    studentLabel.style.cssText = 'display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 18px; padding: 10px; border-radius: 6px; transition: background 0.2s;';
    studentLabel.onmouseover = () => studentLabel.style.background = '#f5f5f5';
    studentLabel.onmouseout = () => studentLabel.style.background = 'transparent';
    
    const studentRadio = document.createElement('input');
    studentRadio.type = 'radio';
    studentRadio.name = 'role';
    studentRadio.value = 'student';
    studentRadio.id = 'role-student';
    studentRadio.checked = true; // Default to student
    studentRadio.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';
    
    const studentText = document.createTextNode('Frank');
    studentLabel.appendChild(studentRadio);
    studentLabel.appendChild(studentText);
    radioContainer.appendChild(studentLabel);
    
    // Teacher radio
    const teacherLabel = document.createElement('label');
    teacherLabel.style.cssText = 'display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 18px; padding: 10px; border-radius: 6px; transition: background 0.2s;';
    teacherLabel.onmouseover = () => teacherLabel.style.background = '#f5f5f5';
    teacherLabel.onmouseout = () => teacherLabel.style.background = 'transparent';
    
    const teacherRadio = document.createElement('input');
    teacherRadio.type = 'radio';
    teacherRadio.name = 'role';
    teacherRadio.value = 'teacher';
    teacherRadio.id = 'role-teacher';
    teacherRadio.style.cssText = 'width: 20px; height: 20px; cursor: pointer;';
    
    const teacherText = document.createTextNode('Chris');
    teacherLabel.appendChild(teacherRadio);
    teacherLabel.appendChild(teacherText);
    radioContainer.appendChild(teacherLabel);
    
    container.appendChild(radioContainer);
    
    // Create media permissions component
    const mediaPermissionsComponent = createMediaPermissionsComponent();
    container.appendChild(mediaPermissionsComponent.container);
    
    // Launch button
    const button = document.createElement('button');
    button.id = 'launch-dcv-button';
    button.textContent = 'Launch DCV in Fullscreen';
    button.disabled = true;
    button.style.cssText = 'padding: 12px 30px; font-size: 18px; background: #cccccc; color: white; border: none; border-radius: 8px; cursor: not-allowed; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-weight: bold; width: 100%; opacity: 0.6;';
    
    // Update button state based on media permissions
    const updateLaunchButton = () => {
        if (mediaPermissionsComponent.webcamEnabled && mediaPermissionsComponent.micEnabled) {
            button.disabled = false;
            button.style.background = '#4CAF50';
            button.style.cursor = 'pointer';
            button.style.opacity = '1';
            button.onmouseover = () => button.style.background = '#45a049';
            button.onmouseout = () => button.style.background = '#4CAF50';
        } else {
            button.disabled = true;
            button.style.background = '#cccccc';
            button.style.cursor = 'not-allowed';
            button.style.opacity = '0.6';
            button.onmouseover = null;
            button.onmouseout = null;
        }
    };
    
    // Set up callback to update button when media status changes
    mediaPermissionsComponent.onStatusChange = updateLaunchButton;
    
    button.onclick = () => {
        if (button.disabled) return;
        
        // Get selected role
        const selectedRole = document.querySelector('input[name="role"]:checked').value;
        selectedConfig = selectedRole === 'teacher' ? CONFIGTEACHER : CONFIGSTUDENT;
        
        container.remove();
        showLoadingMessage();
        enterFullscreen(); 
        main();
    };
    
    container.appendChild(button);
    document.body.appendChild(container);
}

function showLoadingMessage() {
    const loading = document.createElement('div');
    loading.id = 'loading';
    loading.textContent = 'Connecting to DCV...';
    loading.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); padding: 20px 40px; font-size: 18px; background: rgba(0,0,0,0.8); color: white; border-radius: 8px; z-index: 10000;';
    document.body.appendChild(loading);
}

function main () {
    console.log("Setting log level to INFO");
    dcv.setLogLevel(dcv.LogLevel.INFO);
    
    // Use selected config (default to student if not set)
    if (!selectedConfig) {
        selectedConfig = CONFIGSTUDENT;
    }
    
    serverUrl = selectedConfig.DCV_SERVER;
    
    console.log("Starting authentication with", serverUrl);
    
    auth = dcv.authenticate(
        serverUrl,
        {
            promptCredentials: onPromptCredentials,
            error: onError,
            success: onSuccess
        }
    );
}

function challengeHasField(challenge, field) {
    return challenge.requiredCredentials.some(credential => credential.name === field);
}

function onError(auth, error) {
    console.log("Error during the authentication: ", error.message);
}

function onSuccess(auth, result) {
    const {sessionId, authToken} = result[0];
    connect(sessionId, authToken);
}

function updateDcvResolution() {
    if (!connection) return;
    
    const elem = document.getElementById("dcv-display");
    if (!elem) return;
    
    const width = Math.floor(elem.clientWidth);
    const height = Math.floor(elem.clientHeight);
    console.log(`Requesting DCV resolution: ${width}x${height}`);
    connection.requestResolution(width, height).catch(e => {
        console.error("Error requesting resolution: ", e.message);
    });
}

function removeLoadingMessage() {
    const loading = document.getElementById('loading');
    if (loading) loading.remove();
}

function connect(sessionId, authToken) {
    console.log("Starting DCV connection ...", sessionId, authToken);

    setTimeout(() => {
        ['form2', 'fs2', 'butt1'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.style.display = 'none';
        });
    }, 4500);

    dcv.connect({
        url: serverUrl,
        sessionId,
        authToken,
        divId: "dcv-display",
        callbacks: {
            firstFrame: () => {
                console.log("First frame received");
                removeLoadingMessage();
                updateDcvResolution();
            }
        }
    }).then(conn => {
        console.log("Connection established!");
        connection = conn;

        // Create media buttons and set them up immediately so they're always functional
        createMediaButtons();
        setupWebcamButton(connection, false);
        setupMicButton(connection, false);
        
        // Enable webcam and microphone since permissions were already granted
        connection.setWebcam(true)
            .then(() => {
                console.log("Webcam enabled in DCV");
                // Update button to reflect enabled state
                setupWebcamButton(connection, true);
            })
            .catch(e => {
                console.error("Failed to enable webcam in DCV:", e.message);
            });
        
        connection.setMicrophone(true)
            .then(() => {
                console.log("Microphone enabled in DCV");
                // Update button to reflect enabled state
                setupMicButton(connection, true);
            })
            .catch(e => {
                console.error("Failed to enable microphone in DCV:", e.message);
            });

        window.addEventListener('resize', updateDcvResolution);
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach(
            event => document.addEventListener(event, updateDcvResolution)
        );
    }).catch(error => {
        console.log("Connection failed with error " + error.message);
        removeLoadingMessage();
    });
}

function enterFullscreen() {
    const elem = document.getElementById("dcv-display");
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

let fieldSet;

function submitCredentials(e) {
    e.preventDefault();
    const credentials = {};
    fieldSet.childNodes.forEach(input => credentials[input.id] = input.value);
    auth.sendCredentials(credentials);
}

function createLoginForm() {
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Login";
    submitButton.id = "butt1";
    submitButton.style.cssText = 'width: 90px; margin: 6px; box-shadow: grey 1px 1px 6px; font-size: 150%; margin-top: 21px;';

    const form = document.createElement("form");
    fieldSet = document.createElement("fieldset");
    fieldSet.id = "fs2";
    fieldSet.style.cssText = 'width: 300px; box-shadow: grey 5px 5px 9px;';
    
    form.onsubmit = submitCredentials;
    form.appendChild(fieldSet);
    form.appendChild(submitButton);
    document.body.appendChild(form);
}

function addInput(name) {
    const inputField = document.createElement("input");
    inputField.name = name;
    inputField.id = name;
    inputField.placeholder = name;
    inputField.type = name === "password" ? "password" : "text";
    inputField.style.cssText = 'width: 90px; margin: 6px; box-shadow: grey 1px 1px 6px; font-size: 120%; padding: 3px;';
    fieldSet.appendChild(inputField);
} 

function onPromptCredentials(authObj, credentialsChallenge) {
    // Use selected config (default to student if not set)
    if (!selectedConfig) {
        selectedConfig = CONFIGSTUDENT;
    }
    
    if (challengeHasField(credentialsChallenge, "username") && challengeHasField(credentialsChallenge, "password")) {
        authObj.sendCredentials({username: selectedConfig.DCV_USER, password: selectedConfig.DCV_PASSWORD});
    } else {
        createLoginForm();
        credentialsChallenge.requiredCredentials.forEach(challenge => addInput(challenge.name));
    }
}

// -----------------------------------------------------------------
// BUTTON FUNCTIONS FOR WEBCAM AND MICROPHONE
// -----------------------------------------------------------------

function createMediaButtons() {
    // Get the DCV display element
    const dcvDisplay = document.getElementById('dcv-display');
    if (!dcvDisplay) {
        console.error("DCV display element not found");
        return;
    }

    // Create webcam button if it doesn't exist
    if (!document.getElementById('webcam-button')) {
        const webcamButton = document.createElement('button');
        webcamButton.id = 'webcam-button';
        webcamButton.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 10001;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid #333;
            background: white;
            cursor: pointer;
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
        `;
        webcamButton.onmouseover = () => {
            webcamButton.style.transform = 'scale(1.1)';
            webcamButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        };
        webcamButton.onmouseout = () => {
            webcamButton.style.transform = 'scale(1)';
            webcamButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        };
        
        const webcamImg = document.createElement('img');
        webcamImg.src = 'webcam.png';
        webcamImg.alt = 'Webcam';
        webcamImg.style.cssText = 'width: 30px; height: 30px; object-fit: contain;';
        webcamButton.appendChild(webcamImg);
        dcvDisplay.appendChild(webcamButton);
    }

    // Create mic button if it doesn't exist
    if (!document.getElementById('mic-button')) {
        const micButton = document.createElement('button');
        micButton.id = 'mic-button';
        micButton.style.cssText = `
            position: fixed;
            top: 20px;
            left: 80px;
            z-index: 10001;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            border: 2px solid #333;
            background: white;
            cursor: pointer;
            pointer-events: auto;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
        `;
        micButton.onmouseover = () => {
            micButton.style.transform = 'scale(1.1)';
            micButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        };
        micButton.onmouseout = () => {
            micButton.style.transform = 'scale(1)';
            micButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        };
        
        const micImg = document.createElement('img');
        micImg.src = 'mic.png';
        micImg.alt = 'Microphone';
        micImg.style.cssText = 'width: 30px; height: 30px; object-fit: contain;';
        micButton.appendChild(micImg);
        dcvDisplay.appendChild(micButton);
    }
}

function setupWebcamButton(connection, initialIsOn) {
    // Get or create the button
    let webcamButton = document.getElementById('webcam-button');
    if (!webcamButton) {
        createMediaButtons();
        webcamButton = document.getElementById('webcam-button');
    }
    if (!webcamButton) {
        console.error("Webcam button not found");
        return;
    }

    // Use the passed-in initial state
    let isWebcamOn = initialIsOn;

    // Update button style based on state
    if (isWebcamOn) {
        webcamButton.style.background = '#D9534F';
        webcamButton.style.borderColor = '#D9534F';
        webcamButton.style.opacity = '1';
    } else {
        webcamButton.style.background = 'white';
        webcamButton.style.borderColor = '#333';
        webcamButton.style.opacity = '0.6';
    }
    
    webcamButton.onclick = () => {
        isWebcamOn = !isWebcamOn; // Toggle the state
        console.log(`Setting webcam to: ${isWebcamOn}`);
        
        connection.setWebcam(isWebcamOn)
            .then(() => {
                console.log(`Webcam ${isWebcamOn ? 'enabled' : 'disabled'}`);
                if (isWebcamOn) {
                    webcamButton.style.background = '#D9534F';
                    webcamButton.style.borderColor = '#D9534F';
                    webcamButton.style.opacity = '1';
                } else {
                    webcamButton.style.background = 'white';
                    webcamButton.style.borderColor = '#333';
                    webcamButton.style.opacity = '0.6';
                }
            })
            .catch(e => {
                console.error("Failed to toggle webcam:", e.message);
                isWebcamOn = !isWebcamOn; // Revert state on failure
            });
    };
}

function setupMicButton(connection, initialIsOn) {
    // Get or create the button
    let micButton = document.getElementById('mic-button');
    if (!micButton) {
        createMediaButtons();
        micButton = document.getElementById('mic-button');
    }
    if (!micButton) {
        console.error("Mic button not found");
        return;
    }

    // Use the passed-in initial state
    let isMicOn = initialIsOn;

    // Update button style based on state
    if (isMicOn) {
        micButton.style.background = '#D9534F';
        micButton.style.borderColor = '#D9534F';
        micButton.style.opacity = '1';
    } else {
        micButton.style.background = 'white';
        micButton.style.borderColor = '#333';
        micButton.style.opacity = '0.6';
    }

    micButton.onclick = () => {
        isMicOn = !isMicOn; // Toggle the state
        console.log(`Setting microphone to: ${isMicOn}`);
        
        connection.setMicrophone(isMicOn)
            .then(() => {
                console.log(`Microphone ${isMicOn ? 'enabled' : 'disabled'}`);
                if (isMicOn) {
                    micButton.style.background = '#D9534F';
                    micButton.style.borderColor = '#D9534F';
                    micButton.style.opacity = '1';
                } else {
                    micButton.style.background = 'white';
                    micButton.style.borderColor = '#333';
                    micButton.style.opacity = '0.6';
                }
            })
            .catch(e => {
                console.error("Failed to toggle microphone:", e.message);
                isMicOn = !isMicOn; // Revert state on failure
            });
    };
}