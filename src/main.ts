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
  radius:number;
}

interface FoodOrb{
  x: number;
  y: number;
  value: number;
  color: string;
}

const fps = 60;
//const perfectFrameTime = 1000 / fps;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let socket:WebSocket;

let users:IClients;

let id:number;

let lastUpdate:number = Date.now();

let speed = 0;

let mapHeight = 0;
let mapWidth = 0;

let posX = 0;
let posY = 0;
let radius = 0;
let body : SnakePoint[] = [];
let heading = 0;

let boosting = false;

let foodOrbs:FoodOrb[] = [];

let intervals:number[] = []

document.getElementById("login-button")!.onclick = joinGame;

const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resize();
window.addEventListener('resize', resize);

window.onmousedown = ()=>{
  boosting = true;
}

window.onmouseup = () =>{
  boosting = false;
}





function joinGame(){
    let username = (document.getElementById("username-field") as HTMLInputElement).value;
    let ip = (document.getElementById("ip-field") as HTMLInputElement).value;

    socket = new WebSocket(ip);

    socket.onopen = (e) => {

      let data = { method:"connect", username: username }

      socket.send(JSON.stringify(data));

      lastUpdate = Date.now();
      intervals.push(setInterval(nextFrame, 1000 / fps));
      intervals.push(setInterval(updateServer, 1000 / 20));

    };

    socket.onmessage = (ev: MessageEvent) => {
      try{
        let jsonData = JSON.parse(ev.data);

        switch(jsonData.method){
          case "initialData":
            id = jsonData.data.id;

            mapWidth = jsonData.data.mapWidth;
            mapHeight = jsonData.data.mapHeight;

            speed = jsonData.data.speed;
            radius = jsonData.data.radius;

            foodOrbs = jsonData.data.orbs;          

            document.getElementById("login")?.setAttribute("style", "visibility: hidden;")
            break;

          case "update":
            users = jsonData.data;

            posX = users[id].body[0].x;
            posY = users[id].body[0].y;

            body = users[id].body;

            radius = users[id].radius;

            foodOrbs = foodOrbs.concat(jsonData.orbs);

            foodOrbs.forEach((orb)=>{
              if (!orb.color){
                orb.color = `rgb(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255})`;
              }
            })

            break;

          case "dead":
            document.getElementById("login")?.setAttribute("style", "");
            
            intervals.forEach((interval:number)=>{
              clearInterval(interval);
            })

            break

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
  ctx.fillStyle = "#32a852";
  ctx.strokeStyle = "#000000";

  ctx.font = "20px Arial";
  ctx.textAlign = "center";

  Object.keys(users).forEach((userID:any) =>{

    if (userID == id)
      return;

    let offsetX = posX - canvas.width / 2;
    let offsetY = posY - canvas.height / 2;


    users[userID].body.forEach((segment)=>{

      if (isOnScreen(segment.x, segment.y)){
        //draw circle
        ctx.beginPath();
        ctx.arc(segment.x - offsetX, segment.y - offsetY, users[userID].radius, 0, 2 * Math.PI)
        ctx.fill();
        ctx.stroke();
      }
    })

    ctx.strokeText(users[userID].username, users[userID].body[0].x - offsetX, users[userID].body[0].y - offsetY - users[userID].radius)

  })
}

function drawSelf(){
  let offsetX = posX - canvas.width / 2;
  let offsetY = posY - canvas.height / 2;

  ctx.fillStyle = "#32a852";
  ctx.strokeStyle = "#000000";


  body.forEach((segment)=>{
    if (!segment)
      return

    //draw circle
    ctx.beginPath();
    ctx.arc(segment.x - offsetX, segment.y - offsetY, radius, 0, 2 * Math.PI)
    ctx.fill();
    ctx.stroke();
  })
}

function clearCanvas(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function nextFrame(){
  let now = Date.now();
  let dt = (now - lastUpdate) / 1000 // perfectFrameTime;
  lastUpdate = now;

  clearCanvas();


  drawOrbs();
  
  //updateSnakePos(dt);

  drawSelf();
  drawSnakes();
  drawBorder();
  
  checkFoodOrbs();


}

function updateServer(){
  let _data = {
    heading: heading,
    boosting: boosting
  }

  socket.send(JSON.stringify({method:"update", data: _data}))
}
function drawBorder(){
  let offsetX = posX - canvas.width / 2;
  let offsetY = posY - canvas.height / 2;

  ctx.rect(0 - offsetX - 10, 0 - offsetY - 10, mapWidth + 10*2, mapHeight + 10*2);
  ctx.stroke();
}

function angleBetween(x1:number, y1:number, x2:number, y2:number){
  return Math.atan2( y2 - y1, x2 - x1 );
}

function updateSnakePos(dt:number){
  //move snake forward

  let previousPoint = body[0];

  let nextPoint = {
      x: (speed * dt) * Math.cos(heading) + previousPoint.x,
      y: (speed * dt) * Math.sin(heading) + previousPoint.y,
  } as SnakePoint;


  nextPoint = clampPoint(nextPoint);

  body.unshift(nextPoint);
  body.pop();
}

function drawOrbs(){
  let offsetX = posX - canvas.width / 2;
  let offsetY = posY - canvas.height / 2;

  foodOrbs.forEach((orb)=>{

    if (isOnScreen(orb.x, orb.y)){
      ctx.fillStyle = orb.color;

      ctx.beginPath();
      ctx.arc(orb.x - offsetX, orb.y - offsetY, clamp(orb.value*50, 15, 50), 0, 2 * Math.PI)
      ctx.fill();
      ctx.stroke();
    }
  })
}

document.addEventListener("mousemove", (ev) =>{  
  heading = angleBetween(canvas.width/2, canvas.height/2, ev.x, ev.y);
})

function clamp(num:number, min:number, max:number) {
  return Math.min(Math.max(num, min), max)
};

function clampPoint(point:SnakePoint): SnakePoint{
  return {x: clamp(point.x, 0, mapWidth), y: clamp(point.y, 0, mapHeight)}
}

function checkFoodOrbs(){
  Object.keys(users).forEach((key:number|string)=>{

    let data = users[key as number];

    for (let i = foodOrbs.length - 1; i >= 0; i--)
    {
        if (pointDist(foodOrbs[i].x, foodOrbs[i].y, data.body[0].x, data.body[0].y) < data.radius*2 + 10){
            foodOrbs.splice(i, 1);
        }
    }     
  })  
}


function pointDist(x1:number, y1:number, x2:number, y2:number){
  return Math.hypot(x2-x1, y2-y1)
}

function isOnScreen(x:number,y:number){
  if (x > posX - canvas.width / 2 && x < posX + canvas.width / 2 && y > posY - canvas.height / 2 && y < posY + canvas.height / 2){
    return true;
  }

  return false;
}