Stellar Siege
CGD260S Individual Project - WebGL Space Shooter



What is this game

Stellar Siege is a space shooter game that runs in the browser. You control a ship at the bottom of the screen and shoot at enemy ships coming down from the top. The game was built for the CGD260S Computer Graphics 2 module at CPUT using WebGL and JavaScript only - no game engines or libraries were used.



Files you need:

Make sure these four files are all in the same folder before you try to run anything:

- index.html
- game.js
- style.css
- Technical_Report.docx


 How to run the game

The easy way:

Just double click index.html and it should open in your browser and the game will start loading.

If the screen is blank:

Some browsers block WebGL when you open files directly from your computer. If that happens open a terminal in the project folder and run this:


python -m http.server 8080


Then open your browser and go to:


http://localhost:8080


That should fix it. The game has been tested on Chrome and Firefox, either of those should work fine.

How to play : 

| Key | What it does |

| Left Arrow | Move left |
| Right Arrow | Move right |
| Space | Shoot |

The goal is to destroy all the enemy ships in each wave before any of them get to the bottom of the screen. Once you clear a wave the next one starts after a short delay and the enemies get faster and there are more of them.

You start with 3 lives. You lose a life when an enemy bullet hits you or when an enemy reaches the bottom. Lose all 3 and its game over.

Scoring works like this - every enemy you kill is worth 100 points multiplied by whatever wave you are on. So on wave 1 each kill is 100 points, on wave 4 each kill is 400 points and so on.


 What the code covers

The game.js file is split into 24 steps. Here is a quick breakdown of what each section does:

| Steps | What it does |

| 1 | Gets the canvas and starts WebGL |
| 2 - 3 | Writes the vertex and fragment shaders |
| 4 | Links both shaders into shader program A |
| 5 | Creates a second shader program B for the border lines |
| 6 | Builds all 6 matrix functions from scratch |
| 7 | Sets up the camera and perspective |
| 8 | Creates the quad shape and uploads it to the GPU |
| 9 | Creates all the textures with mipmaps |
| 10 | Sets the world size |
| 11 | Creates the star background |
| 12 | Sets up all the game variables |
| 13 | Resets the game when you start or retry |
| 14 | Spawns enemies and updates the score display |
| 15 | Listens for keyboard input |
| 16 | Checks if two objects are touching |
| 17 | Creates the explosion particles |
| 18 | Handles losing a life and game over |
| 19 | Updates all the movement every frame |
| 20 | Draws textured objects like ships and bullets |
| 21 | Draws the solid colour border lines |
| 22 | Draws everything to the screen each frame |
| 23 | The main game loop |
| 24 | Starts the game when you click launch |


CGD260S syllabus topics covered

| Week | Topic | Where in the code |

| 1 | HTML5 canvas and WebGL context | Step 1 and Step 15 |
| 2 | Rotation using trigonometry in the shader | Step 2 and Step 6 |
| 3 | Drawing with triangles | Step 8 and Step 20 |
| 4 | Adding colour to objects | Step 3 |
| 5 | Multiple buffers | Step 8 |
| 6 | Translation and scaling | Step 6 |
| 7 | Object rotation | Step 6 |
| 8 | Matrix functions | Step 6 |
| 9 | Matrix models | Step 20 |
| 10 | Multiple objects using matrix models | Step 22 |
| 11 | Multiple shader programs | Step 4 and Step 5 |
| 12 | Textures and mipmaps | Step 9 |
| 13 | Perspective projection | Step 6 and Step 7 |



 No exe file

The game is written in JavaScript so it runs straight in the browser with no compiling needed. There is no exe file. Opening index.html is how you run it.



Author

Name: Somila Mancoba
Student Number: Mancoba
Module: CGD260S Computer Graphics 2
Lecturer: Mr MT Adonis
CPUT - Cape Peninsula University of Technology
May 2026
