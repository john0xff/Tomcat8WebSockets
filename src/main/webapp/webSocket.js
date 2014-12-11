/**
 * 
 */
var Game = {};

Game.fps = 30;
Game.socket = null;
Game.nextFrame = null;
Game.interval = null;
Game.direction = 'none';
Game.gridSize = 10;

function Snake() {
	this.snakeBody = [];
	this.color = null;
}

// draw the player
Snake.prototype.draw = function(context) {
	
	for ( var id in this.snakeBody) {
		
		context.fillStyle = this.color;
		context.fillRect(this.snakeBody[id].x, this.snakeBody[id].y, Game.gridSize, Game.gridSize);
		
		// 
		Console.log(getTime() + ' ' + 'id = ' + this.snakeBody[id] + ' x = ' + this.snakeBody[id].x + ' y = ' + this.snakeBody[id].y);
	}
};

function getTime() {
	var date = new Date();
	var timer = date.getHours() + ' ' + date.getMinutes() + ' ' + date.getSeconds() + ' ' + date.getMilliseconds();
	
	return timer;
}

Game.initialize = function() {
	
	this.entities = [];
	
	var canvas = document.getElementById('playground');
	
	if (!canvas.getContext) {
		Console.log('Error: 2d canvas not supported by this browser.');
		return;
	}
	
	this.context = canvas.getContext('2d');
	
	window.addEventListener('keydown', function(e) {
		
		var code = e.keyCode;
		
		if (code > 36 && code < 41) {
			
			switch (code) {
			
			case 37:
				if (Game.direction != 'east')
					Game.socket.send('west');
				break;
				
			case 38:
				if (Game.direction != 'south')
					Game.socket.send('north');
				break;
				
			case 39:
				if (Game.direction != 'west')
					Game.socket.send('east');
				break;
				
			case 40:
				if (Game.direction != 'north')
					Game.socket.send('south');
				break;
			}
		}
	}, false);
	
	if (window.location.protocol == 'http:') {
		Game.connect('ws://' + window.location.host + '/Tomcat8WebSockets/websocket/snake');
	} else {
		Game.connect('wss://' + window.location.host + '/Tomcat8WebSockets/websocket/snake');
	}
};

Game.startGameLoop = function() {
	
	if (window.requestAnimationFrame) {
		
		Game.nextFrame = function() {
			requestAnimationFrame(Game.run);
		};
	} else {
		Game.interval = setInterval(Game.run, 1000 / Game.fps);
	}
	
	if (Game.nextFrame != null) {
		Game.nextFrame();
	}
};

Game.stopGameLoop = function() {
	Game.nextFrame = null;
	if (Game.interval != null) {
		clearInterval(Game.interval);
	}
};

Game.draw = function() {
	this.context.clearRect(0, 0, 200, 200);
	for ( var id in this.entities) {
		this.entities[id].draw(this.context);
	}
};

Game.addSnake = function(id, color) {
	Game.entities[id] = new Snake();
	Game.entities[id].color = color;
};

Game.updateSnake = function(id, snakeBody) {
	if (typeof Game.entities[id] != "undefined") {
		Game.entities[id].snakeBody = snakeBody;
		// Console.log(id, snakeBody[id]);
	}
};

Game.removeSnake = function(id) {
	Game.entities[id] = null;
	// Force GC.
	delete Game.entities[id];
};

// 1
Game.run = (function() {
	var skipTicks = 1000 / Game.fps, nextGameTick = (new Date).getTime();

	return function() {
		while ((new Date).getTime() > nextGameTick) {
			nextGameTick += skipTicks;
		}
		Game.draw();
		if (Game.nextFrame != null) {
			Game.nextFrame();
		}
	};
})();

Game.connect = (function(host) {
	if ('WebSocket' in window) {
		Game.socket = new WebSocket(host);
	} else {
		Console.log('Error: WebSocket is not supported by this browser.');
		return;
	}

	// only once on start
	Game.socket.onopen = function() {
		// Socket open.. start the game loop.
		Console.log('Info: WebSocket connection opened.');
		Console.log('Info: Press an arrow key to begin.');
		Game.startGameLoop();
		
		// each 5 sec send ping msg to server
		setInterval(function() {
			
			// Prevent server read timeout.
			Game.socket.send('ping');
		}, 5000);
	};

	// only once on close
	Game.socket.onclose = function() {
		Console.log('Info: WebSocket closed.');
		Game.stopGameLoop();
	};

	// each time when new msg from server
	Game.socket.onmessage = function(message) {
		
		var packet = JSON.parse(message.data);
		
		switch (packet.type) {
		
		case 'update':
			for (var i = 0; i < packet.data.length; i++) {
				Game.updateSnake(packet.data[i].id, packet.data[i].body);
			}
			break;
		
		case 'join':
			for (var j = 0; j < packet.data.length; j++) {
				Game.addSnake(packet.data[j].id, packet.data[j].color);
			}
			break;
		
		case 'leave':
			Game.removeSnake(packet.id);
			break;
		
		case 'dead':
			Console.log('Info: Your snake is dead, bad luck!');
			Game.direction = 'none';
			break;
		
		case 'kill':
			Console.log('Info: Head shot!');
			break;
		}
	};
});

var Console = {};

Console.log = (function(message) {
	var console = document.getElementById('console');
	var p = document.createElement('p');
	p.style.wordWrap = 'break-word';
	p.innerHTML = message;
	console.appendChild(p);
	while (console.childNodes.length > 25) {
		console.removeChild(console.firstChild);
	}
	console.scrollTop = console.scrollHeight;
});

Game.initialize();

document.addEventListener("DOMContentLoaded", function() {
	// Remove elements with "noscript" class - <noscript> is not allowed in
	// XHTML
	var noscripts = document.getElementsByClassName("noscript");
	for (var i = 0; i < noscripts.length; i++) {
		noscripts[i].parentNode.removeChild(noscripts[i]);
	}
}, false);