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

interface FoodOrb{
  x: number;
  y: number;
  value: number;
  color: string;
}

const fps = 60;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

let socket:WebSocket;

let users:IClients;

let id:number;


let snakeRadius = 10;
let speed = 0;

let mapHeight = 0;
let mapWidth = 0;

let posX = 0;
let posY = 0;
let body : SnakePoint[] = [];
let heading = 0;

let foodOrbs:FoodOrb[] = [];

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
          case "initialData":
            id = jsonData.data.id;

            mapWidth = jsonData.data.mapWidth;
            mapHeight = jsonData.data.mapHeight;

            speed = jsonData.data.speed;

            foodOrbs = jsonData.data.orbs;
            console.log(foodOrbs);
          

            document.getElementById("login")?.setAttribute("style", "visibility: hidden;")
            break;

          case "update":
            users = jsonData.data;

            posX = users[id].body[0].x;
            posY = users[id].body[0].y;

            body = users[id].body;

            foodOrbs = foodOrbs.concat(jsonData.orbs);

            foodOrbs.forEach((orb)=>{
              if (!orb.color){
                orb.color = `rgb(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255})`;
              }
            })

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
  ctx.fillStyle = "#32a852";
  ctx.strokeStyle = "#000000";

  Object.keys(users).forEach((userID:any) =>{

    if (userID == id)
      return;

    let offsetX = posX - canvas.width / 2;
    let offsetY = posY - canvas.height / 2;

    users[userID].body.forEach((segment)=>{

      //draw circle
      ctx.beginPath();
      ctx.arc(segment.x - offsetX, segment.y - offsetY, snakeRadius, 0, 2 * Math.PI)
      ctx.fill();
      ctx.stroke();
    })
  })
}

function drawSelf(){
  let offsetX = posX - canvas.width / 2;
  let offsetY = posY - canvas.height / 2;

  ctx.fillStyle = "#32a852";
  ctx.strokeStyle = "#000000";


  body.forEach((segment)=>{

    //draw circle
    ctx.beginPath();
    ctx.arc(segment.x - offsetX, segment.y - offsetY, snakeRadius, 0, 2 * Math.PI)
    ctx.fill();
    ctx.stroke();
  })
}

function clearCanvas(){
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function nextFrame(){
  clearCanvas();

  //updateSnakePos();

  drawSelf();
  drawSnakes();
  drawBorder();
  
  checkFoodOrbs();

  drawOrbs();

}

function updateServer(){
  let _data = {
    heading: heading
  }

  socket.send(JSON.stringify({method:"update", data: _data}))
}
function drawBorder(){
  let offsetX = posX - canvas.width / 2;
  let offsetY = posY - canvas.height / 2;

  ctx.rect(0 - offsetX - snakeRadius, 0 - offsetY - snakeRadius, mapWidth + snakeRadius*2, mapHeight + snakeRadius*2);
  ctx.stroke();
}

function angleBetween(x1:number, y1:number, x2:number, y2:number){
  return Math.atan2( y2 - y1, x2 - x1 );
}

function updateSnakePos(){
  //move snake forward

  let dt = 20 / 1000;

  let previousPoint = body[0];

  let nextPoint = {
      x: speed * dt * Math.cos(heading) + previousPoint.x,
      y: speed * dt * Math.sin(heading) + previousPoint.y,
  } as SnakePoint;


  nextPoint = clampPoint(nextPoint);

  body.unshift(nextPoint);
  body.pop();
}

function drawOrbs(){
  let offsetX = posX - canvas.width / 2;
  let offsetY = posY - canvas.height / 2;

  foodOrbs.forEach((orb)=>{

    ctx.fillStyle = orb.color;

    ctx.beginPath();
    ctx.arc(orb.x - offsetX, orb.y - offsetY, orb.value * 70 + 10, 0, 2 * Math.PI)
    ctx.fill();
    ctx.stroke();
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
  for (let i = foodOrbs.length - 1; i >= 0; i--)
  {
      if (pointDist(foodOrbs[i].x, foodOrbs[i].y, posX, posY) < 20){
          foodOrbs.splice(i, 1);
      }
  }       
}


function pointDist(x1:number, y1:number, x2:number, y2:number){
  return Math.abs(Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2)))
}