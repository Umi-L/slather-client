import './style.css'

let canvas = document.getElementById("canvas") as HTMLCanvasElement;

let socket:WebSocket;

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
    };

    socket.onmessage = (ev: MessageEvent) => {
      console.log(ev.data);
    };

    socket.onerror = (ev) => {
      console.error(ev);
    }

    window.onbeforeunload = () => {
      socket.close();
    }
}