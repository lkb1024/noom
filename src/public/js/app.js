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
let peerConnectionRef = {}
let streamRef = {}

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
    for (const [key, myPeerConnection] of Object.entries(object)) {
        if(myPeerConnection) {
            const videoTrack = myStream.getVideoTracks()[0]
            const videoSender = myPeerConnection.getSenders().find(sender =>
                sender.track.kind === "video");
            videoSender.replaceTrack(videoTrack);
        }
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
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input")
    roomName = input.value
    await initCall();
    console.log(socket.id)
    socket.emit("join_room", roomName);
    input.value = ""
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit)


// Socket Code
socket.on("welcome", async (user)=>{
    if (peerConnectionRef[user] !== undefined) return;
    const myPeerConnection = createPeerConnection(user);
    const offer = await myPeerConnection.createOffer();
    await myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, user);
})

socket.on("offer", async (offer, user)=>{
    if (peerConnectionRef[user] !== undefined) return;
    const myPeerConnection = createPeerConnection(user);
    await myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    await myPeerConnection.setLocalDescription(answer);
    console.log("sent answer from ", user)
    socket.emit("answer", answer, user)
})

socket.on("answer", (answer, user)=>{
    const myPeerConnection = peerConnectionRef[user];
    myPeerConnection.setRemoteDescription(answer);
})

socket.on("ice", async (ice, user)=>{
    const myPeerConnection = peerConnectionRef[user]
    await myPeerConnection.addIceCandidate(ice) 
})

// RTC Code
function  createPeerConnection(user) {
    const peerConnection = new RTCPeerConnection({
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
    peerConnection.onicecandidate = (event)=>{
        event.preventDefault();
        socket.emit("ice", event.candidate, user)
    };
    peerConnection.ontrack = (event)=>{        
        if (streamRef[user] === undefined) {
            var n = 1;
            while (n < 10) {
                const elementId = `peerFace${n}`;
                const peerFace = document.getElementById(elementId)
                n++;
                if(peerFace.srcObject === null){
                    streamRef[user] = elementId;
                    break;
                }
            }

        }
        const peerFace = document.getElementById(streamRef[user])
        peerFace.srcObject = event.streams[0]
    };
    myStream.getTracks()
    .forEach((track) => {
        peerConnection.addTrack(track, myStream)
    })

    if (peerConnection) {
        peerConnectionRef = { ...peerConnectionRef, [user]: peerConnection };
    }

    console.log(`RTCPeerConnection created with ${user}!`)
    return peerConnection;
}

function handleICECandidateEvent(event) {

}
