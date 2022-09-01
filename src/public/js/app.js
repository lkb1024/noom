const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const call = document.getElementById("call")
 
call.hidden = true

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter(device => device.kind == "videoinput")
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option")
            option.value = camera.deviceId
            option.innerText = camera.label
            if(currentCamera.label === camera.label) {
                option.selected = true;
            }
            cameraSelect.appendChild(option)
        })
    } catch(e) {
        console.log(e);
    }
}

async function getMedia(deviceId){
    const initialConstraints = {
        audio: true,
        video: {
          facingMode: { facingMode: "user" }
        }
      }
    const cameraConstraints = {
        audio: true,
        video: {
            deviceId: { exact: deviceId }
        }
    }

    

    // navigator.mediaDevices.getUserMedia(deviceId ? cameraConstraints : initialConstraints)
    // .then(async (localStream) => {
    //     myStream = localStream;
    //     myFace.srcObject = localStream;
    //     localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
    //     if (!deviceId) {
    //         await getCameras()
    //     }
    // })
    // .catch((e)=>{console.log(e)});
    
    try {
        myStream = await navigator.mediaDevices.getUserMedia (
            deviceId ? cameraConstraints : initialConstraints
        )
        myFace.srcObject = myStream
        if (!deviceId) {
            await getCameras()
        }
    } catch(e) {
        console.log(e);
    }
}

function handleMuteClick() {
    myStream
    .getAudioTracks()
    .forEach((track) => track.enabled = !track.enabled)
    if(!muted) {
        muteBtn.innerText = "Unmute"
        muted = true;
    }
    else {
        muteBtn.innerText = "Mute"
        muted = false;
    }
}

function handleCameraClick() {
    myStream
    .getVideoTracks()
    .forEach((track) => track.enabled = !track.enabled)
    if(cameraOff) {
        cameraBtn.innerText = "Turn Camera Off"
        cameraOff = false;
    }
    else {
        cameraBtn.innerText = "Turn Camera On"
        cameraOff = true;
    }
}

async function handleCameraChange() {
    await getMedia(cameraSelect.value);
    if(myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0]
        const videoSender = myPeerConnection.getSenders().find(sender =>{
            sender.track.kind === "video"
        });
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

// Welcome Form (join a room)
const welcome = document.getElementById("welcome")
const welcomeForm = welcome.querySelector("form")

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();    
    createPeerConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input")
    roomName = input.value
    await initCall();
    socket.emit("join_room", roomName);
    input.value = ""
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit)


// Socket Code
socket.on("welcome", async ()=>{
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
    console.log("sent the offer");
})

socket.on("offer", async (offer)=>{
    console.log("received the offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName)
    console.log("sent the answer");
})

socket.on("answer", (answer)=>{
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
})

socket.on("ice", (ice)=>{
    console.log("received candidnate")
    myPeerConnection.addIceCandidate(ice)    
})

// RTC Code
function  createPeerConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
          {
            urls: [
              "stun:stun.l.google.com:19302",
              "stun:stun1.l.google.com:19302",
              "stun:stun2.l.google.com:19302",
              "stun:stun3.l.google.com:19302",
              "stun:stun4.l.google.com:19302",
            ],
          },
        ],
      })
    // myPeerConnection.addEventListener("icecandidate", handleIce);
    // myPeerConnection.addEventListener("addtracks", handleAddStream);
    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.ontrack = handleTrackEvent;
    myStream.getTracks()
    .forEach((track) => {
        myPeerConnection.addTrack(track, myStream)
    })
}

function handleICECandidateEvent(event) {
    console.log("sent candidate")
    socket.emit("ice", event.candidate, roomName)
}

function handleTrackEvent(event) {
    const peerFace = document.getElementById("peerFace")
    peerFace.srcObject = event.streams[0]
}