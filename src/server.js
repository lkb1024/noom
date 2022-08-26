import http from "http";
import SocketIO from "socket.io"
import express from "express";

const app = express();

app.set('view engine', 'pug');
app.set('views', __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"))

const handleListen = () => console.log('Listening on http://localhost:3000')

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);


wsServer.on("connection", socket => {
    socket.Any((event) =>{console.log(`SocketEvent:${event}`)})
    socket.on("enter_room", (roomName)  => {
        console.log(socket.rooms);
        socket.join(roomName)
        console.log(socket.rooms);
    })
})


function onSocketClose() {
    console.log("Disconnected to the Browser❌");
}

// const sockets = [];
// wss.on("connection", (socket) => {
//     sockets.push(socket);
//     socket["nickname"] = "Anon";
//     console.log("Connected to Browser✅");
//     socket.on("close", onSocketClose)
//     socket.on("message", (msg)=>{
//         const message = JSON.parse(msg.toString('utf8'));
//         switch(message.type) {
//             case "new_message":
//                 sockets.forEach((aSocket) => {
//                     aSocket.send(`${socket.nickname}: ${message.payload}`);
//                 });
//                 break;
//             case "nickname":
//                 socket["nickname"] = message.payload;
//                 break;
//         }
//     });
// });



httpServer.listen(3000, handleListen);
