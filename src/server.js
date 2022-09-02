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

wsServer.on("connection", socket =>{
    socket.on("join_room", (roomName) => {
        socket.join(roomName)
        socket.to(roomName).emit("welcome", socket.id)
    })
    socket.on("offer", (offer, user) => {
        socket.to(user).emit("offer", offer, socket.id)
    })
    socket.on("answer", (answer, user) => {
        socket.to(user).emit("answer", answer, socket.id)
    })
    socket.on("ice", (ice, user) => {
        socket.to(user).emit("ice", ice, socket.id)
    })
})


httpServer.listen(3000, handleListen);
