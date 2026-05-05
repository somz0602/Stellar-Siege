

// STEP 1 - the canvas and start WebGL

// grab the <canvas> element from the HTML page
const canvas = document.querySelector(`canvas`);

// ask the canvas for a WebGL drawing context
const webgl = canvas.getContext(`webgl`);

// stop everything if the browser does not support WebGL
if (!webgl) {
    throw new Error("WebGL not supported");
}

// make the canvas fill the full browser window
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;

// STEP 2 - Vertex Shader  (runs on the GPU per vertex)
const vertexShader = webgl.createShader(webgl.VERTEX_SHADER);

webgl.shaderSource(vertexShader, `
    attribute vec3 pos;        
    attribute vec2 uv;         

    uniform mat4 model;        
    uniform mat4 view;         
    uniform mat4 projection;   

    varying vec2 vUV;      

    void main() {
        gl_Position = projection * view * model * vec4(pos, 1.0);
        vUV = uv;
    }
`);

webgl.compileShader(vertexShader);


// STEP 3 - Fragment Shader  (runs on the GPU per pixel)

const fragmentShader = webgl.createShader(webgl.FRAGMENT_SHADER);

webgl.shaderSource(fragmentShader, `
    precision mediump float;

    uniform sampler2D uTexture; 
    uniform vec4 uColor;        

    varying vec2 vUV;

    void main() {
        vec4 t = texture2D(uTexture, vUV);
        if (t.a < 0.1) discard; // if discard <0.1 do not draw pixel
        gl_FragColor = t * uColor; // t is a vec4
    }
`);

webgl.compileShader(fragmentShader);


// STEP 4 - Link the two shaders into one GPU program
const texProgram = webgl.createProgram();
webgl.attachShader(texProgram, vertexShader);
webgl.attachShader(texProgram, fragmentShader);
webgl.linkProgram(texProgram);
webgl.useProgram(texProgram);


// STEP 5 - Second shader program  (solid colour, no texture)

const solidVert = webgl.createShader(webgl.VERTEX_SHADER); //Creating the solid colour vertex shader
webgl.shaderSource(solidVert, `
    attribute vec3 pos;
    uniform mat4 model;
    uniform mat4 view;
    uniform mat4 projection;
    void main() {
        gl_Position = projection * view * model * vec4(pos, 1.0);
    }
`);
webgl.compileShader(solidVert);

const solidFrag = webgl.createShader(webgl.FRAGMENT_SHADER);//Creating the solid colour fragment shader
webgl.shaderSource(solidFrag, `
    precision mediump float;
    uniform vec4 uColor;
    void main() {
        gl_FragColor = uColor;
    }
`);
webgl.compileShader(solidFrag);

const colProgram = webgl.createProgram();
webgl.attachShader(colProgram, solidVert);
webgl.attachShader(colProgram, solidFrag);
webgl.linkProgram(colProgram);



// STEP 6 - Matrix functions
//          Matrices move, rotate and resize objects.

// identity matrix - does nothing, like multiplying by 1
function createmat4() {
    return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]);
}

// move an object to position [x, y, z]
function translate(out, a, v) {
    out[0]=a[0];  out[1]=a[1];  out[2]=a[2];  out[3]=a[3];
    out[4]=a[4];  out[5]=a[5];  out[6]=a[6];  out[7]=a[7];
    out[8]=a[8];  out[9]=a[9];  out[10]=a[10]; out[11]=a[11];
    out[12] = a[0]*v[0] + a[4]*v[1] + a[8] *v[2] + a[12];
    out[13] = a[1]*v[0] + a[5]*v[1] + a[9] *v[2] + a[13];
    out[14] = a[2]*v[0] + a[6]*v[1] + a[10]*v[2] + a[14];
    out[15] = a[3]*v[0] + a[7]*v[1] + a[11]*v[2] + a[15];
    return out;
}

// make an object bigger or smaller
function scale(out, a, v) {
    out[0]=a[0]*v[0];   out[1]=a[1]*v[0];   out[2]=a[2]*v[0];   out[3]=a[3]*v[0];
    out[4]=a[4]*v[1];   out[5]=a[5]*v[1];   out[6]=a[6]*v[1];   out[7]=a[7]*v[1];
    out[8]=a[8]*v[2];   out[9]=a[9]*v[2];   out[10]=a[10]*v[2]; out[11]=a[11]*v[2];
    out[12]=a[12];      out[13]=a[13];      out[14]=a[14];      out[15]=a[15];
    return out;
}

// rotate around the Z axis (spin left or right)
// used to tilt the player ship and spin the enemies
function rotateZ(out, a, angle) {
    let c = Math.cos(angle);
    let s = Math.sin(angle);
    let a00=a[0], a01=a[1], a02=a[2],  a03=a[3];
    let a10=a[4], a11=a[5], a12=a[6],  a13=a[7];
    out[0]=a00*c+a10*s;  out[1]=a01*c+a11*s;  out[2]=a02*c+a12*s;  out[3]=a03*c+a13*s;
    out[4]=a10*c-a00*s;  out[5]=a11*c-a01*s;  out[6]=a12*c-a02*s;  out[7]=a13*c-a03*s;
    out[8]=a[8];   out[9]=a[9];   out[10]=a[10];  out[11]=a[11];
    out[12]=a[12]; out[13]=a[13]; out[14]=a[14];  out[15]=a[15];
    return out;
}

// make far away things look smaller (perspective)
function perspective(out, fov, aspect, near, far) {
    let f  = 1.0 / Math.tan(fov / 2);
    let nf = 1 / (near - far);
    out[0]=f/aspect; out[1]=0;  out[2]=0;                   out[3]=0;
    out[4]=0;        out[5]=f;  out[6]=0;                   out[7]=0;
    out[8]=0;        out[9]=0;  out[10]=(far+near)*nf;      out[11]=-1;
    out[12]=0;       out[13]=0; out[14]=(2*far*near)*nf;    out[15]=0;
    return out;
}

// invert a matrix - used to turn a camera position into a view matrix
function invert(out, a) {
    let a00=a[0],  a01=a[1],  a02=a[2],  a03=a[3];
    let a10=a[4],  a11=a[5],  a12=a[6],  a13=a[7];
    let a20=a[8],  a21=a[9],  a22=a[10], a23=a[11];
    let a30=a[12], a31=a[13], a32=a[14], a33=a[15];
    let b00=a00*a11-a01*a10, b01=a00*a12-a02*a10;
    let b02=a00*a13-a03*a10, b03=a01*a12-a02*a11;
    let b04=a01*a13-a03*a11, b05=a02*a13-a03*a12;
    let b06=a20*a31-a21*a30, b07=a20*a32-a22*a30;
    let b08=a20*a33-a23*a30, b09=a21*a32-a22*a31;
    let b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
    let det = 1.0 / (b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06);
    out[0]=(a11*b11-a12*b10+a13*b09)*det; out[1]=(a02*b10-a01*b11-a03*b09)*det;
    out[2]=(a31*b05-a32*b04+a33*b03)*det; out[3]=(a22*b04-a21*b05-a23*b03)*det;
    out[4]=(a12*b08-a10*b11-a13*b07)*det; out[5]=(a00*b11-a02*b08+a03*b07)*det;
    out[6]=(a32*b02-a30*b05-a33*b01)*det; out[7]=(a20*b05-a22*b02+a23*b01)*det;
    out[8]=(a10*b10-a11*b08+a13*b06)*det; out[9]=(a01*b08-a00*b10+a03*b06)*det;
    out[10]=(a30*b04-a31*b02+a33*b00)*det; out[11]=(a21*b02-a20*b04-a23*b00)*det;
    out[12]=(a11*b07-a10*b09-a12*b06)*det; out[13]=(a00*b09-a01*b07+a02*b06)*det;
    out[14]=(a31*b01-a30*b03-a32*b00)*det; out[15]=(a20*b03-a21*b01+a22*b00)*det;
    return out;
}


// STEP 7 - Set up the camera (view) and projection

// place the camera 14 units back on Z then invert it
// inverting converts "where the camera is" into "how to move the world typa thing"
let view = createmat4();
translate(view, view, [0, 0, 14]);
invert(view, view);

// perspective projection - 45 degree Field Of View, correct aspect ratio
let projection = createmat4(); 
perspective(projection, 45 * Math.PI / 180, canvas.width / canvas.height, 0.1, 100);


// STEP 8 - Quad geometry  (the shape every sprite uses)
//          Every object in the game is this same flat square
//          made of 2 triangles.  The model matrix positions
//          and sizes each one differently.
//
//  Each row: x, y, z,  u, v

const vertices = new Float32Array([
   -0.5, -0.5,  0.0,   0.0, 0.0,   // corner 0  bottom-left
    0.5, -0.5,  0.0,   1.0, 0.0,   // corner 1  bottom-right
    0.5,  0.5,  0.0,   1.0, 1.0,   // corner 2  top-right
   -0.5,  0.5,  0.0,   0.0, 1.0,   // corner 3  top-left
]);

// index buffer - tells WebGL which corners make each triangle
const indices = new Uint16Array([
    0, 1, 2,   // triangle 1
    0, 2, 3    // triangle 2
]);

// upload the vertex data to the GPU
const quadBuffer = webgl.createBuffer(); // Uploading the Vertex Data to the GPU
webgl.bindBuffer(webgl.ARRAY_BUFFER, quadBuffer);
webgl.bufferData(webgl.ARRAY_BUFFER, vertices, webgl.STATIC_DRAW);

// upload the index data to the GPU
const indexBuffer = webgl.createBuffer();
webgl.bindBuffer(webgl.ELEMENT_ARRAY_BUFFER, indexBuffer);
webgl.bufferData(webgl.ELEMENT_ARRAY_BUFFER, indices, webgl.STATIC_DRAW);


// STEP 9 - Textures

function makeTexture(drawFn, w, h) {
    if (!w) w = 64;
    if (!h) h = 64;

    // create a hidden canvas and draw the sprite onto it
    const tmp = document.createElement(`canvas`);//invisible canvas element
    tmp.width  = w;
    tmp.height = h;
    drawFn(tmp.getContext(`2d`), w, h);

    // upload the drawn image to WebGL
    const tex = webgl.createTexture();//empty texture on the GPU
    webgl.bindTexture(webgl.TEXTURE_2D, tex);
    webgl.texImage2D(webgl.TEXTURE_2D, 0, webgl.RGBA, webgl.RGBA, webgl.UNSIGNED_BYTE, tmp);

    // generate mipmaps (smaller copies used when texture appears small)
    webgl.generateMipmap(webgl.TEXTURE_2D);
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MIN_FILTER, webgl.LINEAR_MIPMAP_LINEAR);//texture is smaller on screen
    webgl.texParameteri(webgl.TEXTURE_2D, webgl.TEXTURE_MAG_FILTER, webgl.LINEAR);

    return tex;
}

// player ship texture
const shipTexture = makeTexture(function(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    let g = ctx.createRadialGradient(w/2, h, 0, w/2, h, w*0.5);
    g.addColorStop(0, `rgba(255,140,0,0.9)`);
    g.addColorStop(1, `rgba(255,30,0,0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `#cc5500`;
    ctx.beginPath();
    ctx.moveTo(w*0.35, h-4); ctx.lineTo(w*0.65, h-4);
    ctx.lineTo(w*0.72, h*0.55); ctx.lineTo(w*0.28, h*0.55);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `#aa3300`;
    ctx.beginPath();
    ctx.moveTo(w*0.28, h*0.55); ctx.lineTo(w*0.05, h*0.72);
    ctx.lineTo(w*0.05, h*0.85); ctx.lineTo(w*0.35, h*0.72);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w*0.72, h*0.55); ctx.lineTo(w*0.95, h*0.72);
    ctx.lineTo(w*0.95, h*0.85); ctx.lineTo(w*0.65, h*0.72);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `#ff8800`;
    ctx.beginPath();
    ctx.moveTo(w/2, 4); ctx.lineTo(w*0.62, h*0.38); ctx.lineTo(w*0.38, h*0.38);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `#dd6600`; ctx.fillRect(w*0.3, h*0.35, w*0.4, h*0.22);
    ctx.fillStyle = `#ffdd88`; ctx.fillRect(w*0.38, h*0.37, w*0.24, h*0.12);
    ctx.fillStyle = `#ffcc44`;
    ctx.fillRect(w*0.03, h*0.68, w*0.07, h*0.06);
    ctx.fillRect(w*0.90, h*0.68, w*0.07, h*0.06);
});

// enemy ship texture
const enemyTexture = makeTexture(function(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    let g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    g.addColorStop(0, `rgba(220,40,0,0.4)`);
    g.addColorStop(1, `rgba(180,20,0,0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `#881100`; ctx.fillRect(w*0.15, h*0.28, w*0.7, h*0.38);
    ctx.fillStyle = `#aa2200`;
    ctx.fillRect(w*0.02, h*0.40, w*0.18, h*0.22);
    ctx.fillRect(w*0.80, h*0.40, w*0.18, h*0.22);
    ctx.fillStyle = `#ff4400`; ctx.fillRect(w*0.38, h*0.32, w*0.24, h*0.28);
    ctx.fillStyle = `#ffbb00`; ctx.fillRect(w*0.26, h*0.44, w*0.48, h*0.07);
    ctx.fillStyle = `#cc3300`; ctx.fillRect(w*0.35, h*0.60, w*0.3, h*0.18);
});

// player bullet texture (glowing dot)
const bulletTexture = makeTexture(function(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    let g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    g.addColorStop(0, `rgba(255,255,180,1)`);
    g.addColorStop(1, `rgba(255,60,0,0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}, 32, 32);

// enemy bullet texture (orange glowing dot)
const enemyBulletTexture = makeTexture(function(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    let g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    g.addColorStop(0, `rgba(255,200,50,1)`);
    g.addColorStop(1, `rgba(255,50,0,0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}, 32, 32);

// star texture (tiny warm dot)
const starTexture = makeTexture(function(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    let g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    g.addColorStop(0, `rgba(255,220,150,1)`);
    g.addColorStop(1, `rgba(255,100,0,0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}, 16, 16);

// explosion particle texture
const particleTexture = makeTexture(function(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    let g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/2);
    g.addColorStop(0, `rgba(255,220,100,1)`);
    g.addColorStop(1, `rgba(255,40,0,0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}, 32, 32);


// STEP 10 - World size constants
// The game world goes -8 to +8 on X, -5 to +5 on Y


const HALF_W = 8;
const HALF_H = 5;


// STEP 11 - Create 120 background stars

let stars = [];

for (let i = 0; i < 120; i++) {
    stars.push({
        x:     (Math.random() - 0.5) * 16,  // random X across world width
        y:     (Math.random() - 0.5) * 10,  // random Y across world height
        z:     -1 - Math.random() * 2,       // behind the gameplay (negative Z)
        speed: 0.3 + Math.random() * 1.2,    // scroll speed
        size:  0.08 + Math.random() * 0.14,  // how big
        alpha: 0.3 + Math.random() * 0.7     // how bright
    });
}


// STEP 12 - Game state variables

let gameRunning     = false;  // is the game playing right now?
let score           = 0;
let lives           = 3;
let wave            = 1;

let player          = null;   // the player ship object
let playerBullets   = [];     // bullets the player fired
let enemyBullets    = [];     // bullets the enemies fired
let enemies         = [];     // all active enemy ships
let particles       = [];     // explosion particles

let keys            = {};     // which keys are currently held down
let lastTime        = 0;      // timestamp of the previous frame
let shootCooldown   = 0;      // stops the player firing too fast
let enemyShootTimer = 0;      // timer that controls when enemies shoot
let waveClearing    = false;  // true when waiting to start the next wave
let waveClearTimer  = 0;      // countdown before next wave starts


// STEP 13 - Start the game (or restart it)
function initGame() {
    score = 0;
    lives = 3;
    wave  = 1;

    // place the player at the bottom centre of the screen
    player = {
        x:        0,
        y:        -HALF_H + 1.2,
        width:    1.0,
        height:   1.2,
        angle:    0,       // tilt angle when moving left or right
        hitTimer: 0        // invincibility seconds remaining after a hit
    };

    playerBullets  = [];
    enemyBullets   = [];
    enemies        = [];
    particles      = [];
    keys           = {};
    shootCooldown  = 0;
    enemyShootTimer = 0;
    waveClearing   = false;

    spawnWave(wave);
    updateHUD();
}


// STEP 14 - Spawn a wave of enemies in a grid

function spawnWave(n) {
    enemies = [];

    // add one more column and one more row each wave
    let cols = Math.min(n + 4, 9);
    let rows = Math.min(1 + Math.floor(n / 2), 4);
    let gap  = 16 / (cols + 1);   // space them evenly across the world

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            enemies.push({
                x:         -HALF_W + gap * (c + 1),
                y:         HALF_H - 1.5 - r * 0.9,
                width:     0.9,
                height:    0.9,
                angle:     Math.PI,                              // face downward
                speedX:    (0.4 + n * 0.08) * (Math.random() > 0.5 ? 1 : -1),
                bobOffset: Math.random() * Math.PI * 2           // gentle up/down bobbing
            });
        }
    }

    // show the wave number in the middle of the screen briefly
    const banner = document.getElementById(`wave-banner`);
    banner.textContent = `WAVE ` + n;
    banner.style.opacity = 1;
    setTimeout(function() { banner.style.opacity = 0; }, 1800);
}


// update the score / lives / wave number shown on screen
function updateHUD() {
    document.getElementById(`score-display`).textContent = score;
    document.getElementById(`wave-display`).textContent  = wave;

    // draw one triangle symbol per remaining life
    const livesDiv = document.getElementById(`lives-display`);
    livesDiv.innerHTML = ``;
    for (let i = 0; i < lives; i++) {
        const s = document.createElement(`span`);
        s.textContent = `▲`;
        livesDiv.appendChild(s);
    }
}


// STEP 15 - Keyboard input
// Store which keys are currently held in the keys


window.addEventListener(`keydown`, function(e) {
    keys[e.code] = true;
    // stop the browser from scrolling when arrow keys or space are pressed
    if (e.code === `Space`)      e.preventDefault();
    if (e.code === `ArrowLeft`)  e.preventDefault();
    if (e.code === `ArrowRight`) e.preventDefault();
});

window.addEventListener(`keyup`, function(e) {
    keys[e.code] = false;
});


// STEP 16 - Collision detection
//           Returns true if two objects overlap.

function overlapping(a, b) {
    let xDist = Math.abs(a.x - b.x);
    let yDist = Math.abs(a.y - b.y);
    return xDist < (a.width  + b.width)  * 0.4
        && yDist < (a.height + b.height) * 0.4;
}


// STEP 17 - Spawn an explosion at a position
//           Creates 12 particles flying in random directions.

function spawnExplosion(x, y) {
    for (let i = 0; i < 12; i++) {
        let angle = Math.random() * Math.PI * 2;  // random direction
        let speed = 1 + Math.random() * 3;
        particles.push({
            x: x, y: y,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            size:   0.15 + Math.random() * 0.25,
            life:   0.3  + Math.random() * 0.5   // seconds before it disappears
        });
    }
}


// STEP 18 - Lose a life
// -------------------------------------------------------------

function loseLife() {
    lives--;
    player.hitTimer = 1.5;   // player is invincible for 1.5 seconds
    updateHUD();

    if (lives <= 0) {
        // show game over screen
        gameRunning = false;
        const o = document.getElementById(`overlay`);
        o.innerHTML = `
            <h1 style="color:#ff3300">GAME OVER</h1>
            <p>Score: ` + score + ` &nbsp;|&nbsp; Wave: ` + wave + `</p>
            <button onclick="startGame()">RETRY</button>`;
        o.style.display = `flex`;
    }
}


// STEP 19 - Update  (runs every frame)
//           Moves everything and checks for collisions.

function update(dt) {

    // move the player left and right
    if (keys[`ArrowLeft`])  player.x -= 6 * dt;
    if (keys[`ArrowRight`]) player.x += 6 * dt;

    // keep the player inside the arena
    if (player.x < -HALF_W + 0.6) player.x = -HALF_W + 0.6;
    if (player.x >  HALF_W - 0.6) player.x =  HALF_W - 0.6;

    // tilt the ship slightly when moving (smoothly lerps to target angle)
    let targetAngle = 0;
    if (keys[`ArrowLeft`])  targetAngle =  0.2;
    if (keys[`ArrowRight`]) targetAngle = -0.2;
    player.angle += (targetAngle - player.angle) * 5 * dt;

    // count down the invincibility timer
    if (player.hitTimer > 0) player.hitTimer -= dt;

    // player shooting
    shootCooldown -= dt;
    if (keys[`Space`] && shootCooldown <= 0) {
        playerBullets.push({
            x: player.x, y: player.y + 0.6,
            speedY: 12, width: 0.15, height: 0.45
        });
        shootCooldown = 0.22;   // wait 0.22 seconds before the next shot
    }

    // move player bullets upward, check if they hit an enemy
    let aliveBullets = [];
    for (let i = 0; i < playerBullets.length; i++) {
        let b = playerBullets[i];
        b.y += b.speedY * dt;
        if (b.y > HALF_H + 1) continue;   // remove if off the top
        let hit = false;
        for (let j = 0; j < enemies.length; j++) {
            if (overlapping(b, enemies[j])) {
                spawnExplosion(enemies[j].x, enemies[j].y);
                enemies.splice(j, 1);   // remove the enemy
                score += 100 * wave;
                updateHUD();
                hit = true;
                break;
            }
        }
        if (!hit) aliveBullets.push(b);
    }
    playerBullets = aliveBullets;

    // move enemies side to side and bounce off the walls
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        e.x += e.speedX * dt;
        if (e.x < -HALF_W + 0.6) { e.x = -HALF_W + 0.6; e.speedX =  Math.abs(e.speedX); }
        if (e.x >  HALF_W - 0.6) { e.x =  HALF_W - 0.6; e.speedX = -Math.abs(e.speedX); }
        // gentle bobbing up and down
        e.y += Math.sin(Date.now() / 900 + e.bobOffset) * 0.0008;
        // if an enemy reaches the bottom the player loses a life
        if (e.y < -HALF_H + 1) {
            spawnExplosion(e.x, e.y);
            enemies.splice(i, 1);
            i--;
            loseLife();
        }
    }

    // enemies shoot at the player
    enemyShootTimer -= dt;
    if (enemyShootTimer <= 0 && enemies.length > 0) {
        let shooter = enemies[Math.floor(Math.random() * enemies.length)];
        enemyBullets.push({
            x: shooter.x, y: shooter.y - 0.5,
            speedY: -6 - wave * 0.3,   // negative = moving downward
            width: 0.15, height: 0.35
        });
        enemyShootTimer = Math.max(0.5, 1.8 - wave * 0.12);   // faster each wave
    }

    // move enemy bullets downward, check if they hit the player
    let aliveEnemyBullets = [];
    for (let i = 0; i < enemyBullets.length; i++) {
        let b = enemyBullets[i];
        b.y += b.speedY * dt;
        if (b.y < -HALF_H - 1) continue;   // remove if off the bottom
        if (player.hitTimer <= 0 && overlapping(b, player)) {
            spawnExplosion(player.x, player.y);
            loseLife();
            continue;
        }
        aliveEnemyBullets.push(b);
    }
    enemyBullets = aliveEnemyBullets;

    // move and fade explosion particles
    let aliveParticles = [];
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.x    += p.speedX * dt;
        p.y    += p.speedY * dt;
        p.life -= dt;
        if (p.life > 0) aliveParticles.push(p);
    }
    particles = aliveParticles;

    // check if all enemies are gone - start next wave
    if (enemies.length === 0 && !waveClearing && gameRunning) {
        waveClearing  = true;
        waveClearTimer = 1.5;
    }
    if (waveClearing) {
        waveClearTimer -= dt;
        if (waveClearTimer <= 0) {
            wave++;
            playerBullets = [];
            enemyBullets  = [];
            spawnWave(wave);
            waveClearing = false;
            updateHUD();
        }
    }

    // scroll the stars downward to create a sense of movement
    for (let i = 0; i < stars.length; i++) {
        stars[i].y -= stars[i].speed * dt * 0.25;
        if (stars[i].y < -HALF_H - 0.5) stars[i].y = HALF_H + 0.5;
    }
}


// STEP 20 - Draw a textured sprite
//           Builds a model matrix for the object then sends
//           all three matrices (model, view, projection) to
//           the GPU and draws 2 triangles = 1 quad.

function drawSprite(tex, x, y, z, w, h, angle, r, g, b, a) {

    webgl.useProgram(texProgram);
    webgl.bindBuffer(webgl.ARRAY_BUFFER, quadBuffer);

    // tell WebGL how to read position data from the buffer
    // each vertex is 5 floats (x,y,z,u,v) = 20 bytes stride
    // position starts at byte 0
    const posLoc = webgl.getAttribLocation(texProgram, `pos`);
    webgl.enableVertexAttribArray(posLoc);
    webgl.vertexAttribPointer(posLoc, 3, webgl.FLOAT, false, 5 * 4, 0);

    // tell WebGL how to read UV data from the buffer
    // UV starts at byte 12 (after the 3 position floats)
    const uvLoc = webgl.getAttribLocation(texProgram, `uv`);
    webgl.enableVertexAttribArray(uvLoc);
    webgl.vertexAttribPointer(uvLoc, 2, webgl.FLOAT, false, 5 * 4, 3 * 4);

    // build the model matrix: translate → rotate → scale
    let model = createmat4();
    translate(model, model, [x, y, z]);
    if (angle !== 0) rotateZ(model, model, angle);
    scale(model, model, [w, h, 1]);

    // send the three matrices to the vertex shader
    webgl.uniformMatrix4fv(webgl.getUniformLocation(texProgram, `model`),      false, model);
    webgl.uniformMatrix4fv(webgl.getUniformLocation(texProgram, `view`),       false, view);
    webgl.uniformMatrix4fv(webgl.getUniformLocation(texProgram, `projection`), false, projection);

    // send the colour tint to the fragment shader
    webgl.uniform4fv(webgl.getUniformLocation(texProgram, `uColor`), [r, g, b, a]);

    // bind the texture to texture slot 0
    webgl.activeTexture(webgl.TEXTURE0);
    webgl.bindTexture(webgl.TEXTURE_2D, tex);
    webgl.uniform1i(webgl.getUniformLocation(texProgram, `uTexture`), 0);

    // draw 6 indices = 2 triangles = 1 square
    webgl.drawElements(webgl.TRIANGLES, 6, webgl.UNSIGNED_SHORT, 0);
}


// STEP 21 - Draw a solid colour rectangle (no texture)
//           Used for the two arena border lines.

function drawRect(x, y, w, h, r, g, b, a) {

    webgl.useProgram(colProgram);
    webgl.bindBuffer(webgl.ARRAY_BUFFER, quadBuffer);

    // read position data the same way as drawSprite
    const posLoc = webgl.getAttribLocation(colProgram, `pos`);
    webgl.enableVertexAttribArray(posLoc);
    webgl.vertexAttribPointer(posLoc, 3, webgl.FLOAT, false, 5 * 4, 0);

    let model = createmat4();
    translate(model, model, [x, y, 0]);
    scale(model, model, [w, h, 1]);

    webgl.uniformMatrix4fv(webgl.getUniformLocation(colProgram, `model`),      false, model);
    webgl.uniformMatrix4fv(webgl.getUniformLocation(colProgram, `view`),       false, view);
    webgl.uniformMatrix4fv(webgl.getUniformLocation(colProgram, `projection`), false, projection);
    webgl.uniform4fv(webgl.getUniformLocation(colProgram, `uColor`), [r, g, b, a]);

    webgl.drawElements(webgl.TRIANGLES, 6, webgl.UNSIGNED_SHORT, 0);
}


// STEP 22 - Render  (draws everything each frame)
// -------------------------------------------------------------

function render() {

    // clear the screen to near-black dark red
    webgl.viewport(0, 0, canvas.width, canvas.height);
    webgl.clearColor(0.04, 0.008, 0.0, 1.0);
    webgl.clear(webgl.COLOR_BUFFER_BIT | webgl.DEPTH_BUFFER_BIT);

    // enable depth test so objects at different Z sort correctly
    webgl.enable(webgl.DEPTH_TEST);

    // enable blending so transparent parts of textures show through
    webgl.enable(webgl.BLEND);
    webgl.blendFunc(webgl.SRC_ALPHA, webgl.ONE_MINUS_SRC_ALPHA);

    // draw stars first (they are behind everything else)
    for (let i = 0; i < stars.length; i++) {
        let s = stars[i];
        drawSprite(starTexture, s.x, s.y, s.z, s.size, s.size, 0, 1, 1, 1, s.alpha);
    }

    // draw the player ship (flash when recently hit)
    if (gameRunning) {
        let flashing = player.hitTimer > 0 && Math.floor(player.hitTimer * 8) % 2 === 0;
        if (!flashing) {
            drawSprite(shipTexture, player.x, player.y, 0, player.width, player.height, player.angle, 1, 1, 1, 1);
        }
    }

    // draw enemies
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        drawSprite(enemyTexture, e.x, e.y, 0, e.width, e.height, e.angle, 1, 1, 1, 1);
    }

    // draw player bullets (golden tint)
    for (let i = 0; i < playerBullets.length; i++) {
        let b = playerBullets[i];
        drawSprite(bulletTexture, b.x, b.y, 0, b.width, b.height, 0, 1, 0.9, 0.2, 1);
    }

    // draw enemy bullets (orange tint)
    for (let i = 0; i < enemyBullets.length; i++) {
        let b = enemyBullets[i];
        drawSprite(enemyBulletTexture, b.x, b.y, 0, b.width, b.height, 0, 1, 0.7, 0.2, 1);
    }

    // draw explosion particles (fade out as life runs out)
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        let alpha = p.life / 0.8;
        drawSprite(particleTexture, p.x, p.y, 0.1, p.size, p.size, 0, 1, 0.4, 0.05, alpha);
    }

    // draw the two arena border lines using the solid colour shader
    drawRect(-HALF_W - 0.04, 0, 0.04, 10, 1, 0.35, 0, 0.35);
    drawRect( HALF_W + 0.04, 0, 0.04, 10, 1, 0.35, 0, 0.35);
}


// STEP 23 - Game loop
//           requestAnimationFrame calls this ~60 times/second.
//           dt keeps movement framerate-independent.

function gameLoop(timestamp) {

    // how many seconds since the last frame
    let dt = (timestamp - lastTime) / 1000;

    // cap dt so a large gap (e.g. switching tabs) doesn't break things
    if (dt > 0.05) dt = 0.05;

    lastTime = timestamp;

    if (gameRunning) {
        update(dt);
    } else {
        // still scroll stars on the menu / game over screen
        for (let i = 0; i < stars.length; i++) {
            stars[i].y -= stars[i].speed * dt * 0.25;
            if (stars[i].y < -HALF_H - 0.5) stars[i].y = HALF_H + 0.5;
        }
    }

    render();

    // ask the browser to call gameLoop again next frame
    requestAnimationFrame(gameLoop);
}


// STEP 24 - Start the game when the button is clicked

function startGame() {
    document.getElementById(`overlay`).style.display = `none`;
    initGame();
    gameRunning = true;
}

document.getElementById(`startBtn`).addEventListener(`click`, startGame);

// kick off the loop
lastTime = performance.now();
requestAnimationFrame(gameLoop);