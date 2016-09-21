// This code is garbage and I did not write it. Can't remember where I got it though.
var ShaderCanvas = function(optionsObj) {
  "use strict";

  var options = optionsObj || {};

  var defaultVertexShader = 'attribute vec2 pos;\n\
void main() {\n\
    gl_Position = vec4(pos.x, pos.y, 0.0, 1.0);\n\
}';

  var defaultFragmentShader = '#ifdef GL_ES\n\
precision highp float;\n\
#endif\n\
\n\
uniform vec2 size;\n\
uniform float time;\n\
\n\
void main(void) {\n\
    vec4 pos = gl_FragCoord;\n\
    float red = sin(time);\n\
    float green = pos.y / size.y;\n\
    float blue = 1.0 - red - green;\n\
    float alpha = 1.0;\n\
    gl_FragColor = vec4(red, green, blue, alpha);\n\
}';

  this.width = options.width || 300;
  this.height = options.height || 150;
  this.quality = options.quality || 1;
  this.canvasElement = document.createElement('canvas');
  this.containerElement = options.container || document.body;
  this.canvasOptions = options.canvasOptions || {preserveDrawingBuffer: true};
  this.fragmentShaderSrc = options.fragmentShader || defaultFragmentShader;
  this.vertexShaderSrc = options.vertexShader || defaultVertexShader;

  this.canvasElement.className = options.classAttr || "";
  this.canvasElement.innerHTML = options.canvasInnerHTML || "Please use a Canvas and WebGL enabled browser like Google Chrome.";
  this.containerElement.appendChild(this.canvasElement);
  this.setDimensions(this.width, this.height);
  this.animating = false;
  this.animationTime;
  this.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

  try {
    this.gl = this.canvasElement.getContext("webgl", this.canvasOptions);
    this.gl = this.gl || this.canvasElement.getContext("experimental-webgl", this.canvasOptions);
  } catch(e) {
    if (window.console) {
      console.log("ShaderCanvas ERROR: WebGL not supported.");
    }
    //alert("Please use a WebGL enaled browser like Google Chrome.");
    return null;
  }

  var gl = this.gl;
  var verts = [-1.0, 1.0,   -1.0, -1.0,   1.0, -1.0,   1.0, -1.0,   1.0, 1.0,   -1.0, 1.0];

  gl.mainBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.mainBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

  this.compileShaders();
  this.draw();
}

ShaderCanvas.prototype.setVertexShader = function(shader) {
  "use strict";
  this.vertexShaderSrc = shader;
}

ShaderCanvas.prototype.setFragmentShader = function(shader) {
  "use strict";
  this.fragmentShaderSrc = shader;
}

ShaderCanvas.prototype.compileShaders = function(){
  "use strict";
  var gl = this.gl;
  if (!gl) {
      return;
  }

  var newShaderProgram = gl.createProgram();

  var fragmentShaderSrc = this.fragmentShaderSrc;
  var vertexShaderSrc = this.vertexShaderSrc;

  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

  gl.shaderSource(vertexShader, vertexShaderSrc);
  gl.shaderSource(fragmentShader, fragmentShaderSrc);

  gl.compileShader(vertexShader);
  gl.compileShader(fragmentShader);

  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    var log = gl.getShaderInfoLog(vertexShader);
    gl.deleteProgram(newShaderProgram);
    console.log("Vertex shader error: ", log);
    return log;
  }

  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    var log = gl.getShaderInfoLog(fragmentShader);
    gl.deleteProgram(newShaderProgram);
    console.log("Fragment shader error: ", log);
    return log;
  }

  gl.attachShader(newShaderProgram, vertexShader);
  gl.attachShader(newShaderProgram, fragmentShader);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  gl.linkProgram(newShaderProgram);

  if (!gl.getProgramParameter(newShaderProgram, gl.LINK_STATUS)) {
    var log = gl.getProgramInfoLog(newShaderProgram);
    gl.deleteProgram( tmpProgram );
    console.log("Program link error: ", log);
    return log;
  }

  if (gl.shaderProgram) {
      gl.deleteProgram(gl.shaderProgram);
  }
  gl.shaderProgram = newShaderProgram;

  return;
}

ShaderCanvas.prototype.draw = function(time){
  "use strict";
  var gl = this.gl;
  if (!gl || !gl.shaderProgram) {
    return;
  }
  if (time === undefined && this.animating) {
    this.animate();
    return;
  }
  if (this.animationTime === null && time !== undefined) {
    this.animationTime = time-1;
  }
  this.animationTime = Math.min(time-1, this.animationTime);


  time = time !== undefined ? time - this.animationTime : 1;

  var width = parseInt(this.canvasElement.getAttribute('width'));
  var height = parseInt(this.canvasElement.getAttribute('height'));
  gl.viewport(0, 0, width, height);

  gl.useProgram(gl.shaderProgram);

  var posLoc = gl.getAttribLocation(gl.shaderProgram, "pos");
  var sizeLoc = gl.getUniformLocation(gl.shaderProgram, "size");
  var timeLoc = gl.getUniformLocation(gl.shaderProgram, "time");

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.mainBuffer);

  if (timeLoc) {
    gl.uniform1f(timeLoc, time/300);
  }

  if (sizeLoc) {
    gl.uniform2f(sizeLoc, width, height);
  }

  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(posLoc);

  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.disableVertexAttribArray(posLoc);

  if (typeof this.oneTimeDrawCallback === 'function') {
    this.oneTimeDrawCallback();
    this.oneTimeDrawCallback = null;
  }

  if (this.animating) {
    var self = this;
    this.requestAnimationFrame.call(window, function(time){
      self.draw(time);
    });
  }
}

ShaderCanvas.prototype.setDimensions = function(width, height) {
  "use strict";
  width = parseInt(width);
  height = parseInt(height);
  var canvas = this.canvasElement;
  if (!isNaN(width) && !isNaN(height)) {
    canvas.setAttribute("width", Math.floor(width * this.quality));
    canvas.setAttribute("height", Math.floor(height * this.quality));
    canvas.style.width = width+'px';
    canvas.style.height = height+'px';
  }
  if (!this.animating) {
    this.draw();
  }
}

ShaderCanvas.prototype.setQuality = function(quality) {
  "use strict";
  quality = Math.max(Math.min(quality, 1), 0.05);
  this.quality = quality;

  var canvas = this.canvasElement;
  var realWidth = parseInt(canvas.style.width);
  var realHeight = parseInt(canvas.style.height);

  canvas.setAttribute("width", Math.floor(realWidth * quality));
  canvas.setAttribute("height", Math.floor(realHeight * quality));

  if (!this.animating) {
    this.draw();
  }
}

ShaderCanvas.prototype.animate = function(){
  "use strict";
  this.animating = true;
  this.animationTime = null;
  var self = this;
  this.requestAnimationFrame.call(window, function(time){
    self.draw(time);
  });
}

ShaderCanvas.prototype.stopAnimation = function() {
  "use strict";
  this.animating = false;
}
