import './style.css'

interface IClients {
  [key: number]:PlayerData
}

interface SnakePoint{
  x:number;
  y:number;
}

interface PlayerData{
  username:string;
  length: number;
  body: SnakePoint[];
  heading: number;
  speed: number;
}

const fps = 60;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let socket:WebSocket;

let users:IClients;

let id:number;


let snakeRadius = 10;


let posX = 0;
let posY = 0;
let body : SnakePoint[] = [];
let heading = 0;

document.getElementById("login-button")!.onclick = joinGame;

const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resize();
window.addEventListener('resize', resize);





function joinGame(){
    let username = (document.getElementById("username-field") as HTMLInputElement).value;
    let ip = (document.getElementById("ip-field") as HTMLInputElement).value;

    socket = new WebSocket(ip);

    socket.onopen = (e) => {

      let data = { method:"connect", username: username }

      socket.send(JSON.stringify(data));

      setInterval(nextFrame, 1000/fps);
      setInterval(updateServer, 1000 / 20);

    };

    socket.onmessage = (ev: MessageEvent) => {
      try{
        let jsonData = JSON.parse(ev.data);

        switch(jsonData.method){
          case "sendSelf":
            id = jsonData.id;
            document.getElementById("login")?.setAttribute("style", "visibility: hidden;")
            break;

          case "update":
            users = jsonData.data;

            posX = users[id].body[0].x;
            posY = users[id].body[0].y;

            body = users[id].body;

            break;
        }

      }catch(error){
        console.log("error prosessing message");
        console.log(error);
      }
    };

    socket.onerror = (ev) => {
      console.error(ev);
    }

    window.onbeforeunload = () => {
      socket.close();
    }
}

function drawSnakes(){
  Object.keys(users).forEach((userID:any) =>{

    if (userID == id)
      return;

    let offsetX = posX - canvas.width / 2;
    let offsetY = posY - canvas.height / 2;

    users[userID].body.forEach((segment)=>{

      //draw circle
      ctx.beginPath();
      ctx.arc(segment.x - offsetX, segment.y - offsetY, snakeRadius, 0, 2 * Math.PI)
      ctx.stroke();
    })
  })
}

function drawSelf(){
  let offsetX = posX - canvas.width / 2;
  let offsetY = posY - canvas.height / 2;

  body.forEach((segment)=>{

    //draw circle
    ctx.beginPath();
    ctx.arc(segment.x - offsetX, segment.y - offsetY, snakeRadius, 0, 2 * Math.PI)
    ctx.stroke();
  })
}

function clearCanvas(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function nextFrame(){
  clearCanvas();
  drawSelf();
  drawSnakes();
}

function updateServer(){
  let _data = {
    heading: heading
  }

  socket.send(JSON.stringify({method:"update", data: _data}))
}

function angleBetween(x1:number, y1:number, x2:number, y2:number){
  return Math.atan2( y2 - y1, x2 - x1 );
}

document.addEventListener("mousemove", (ev) =>{  
  heading = angleBetween(canvas.width/2, canvas.height/2, ev.x, ev.y);
})