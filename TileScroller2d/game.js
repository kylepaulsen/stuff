;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var SeededRandom = require("./SeededRandom");
var SimplexNoise = require("./SimplexNoise");

var util = require("./util");

function Map(seed, mapSize) {
    var randomGenerator = SeededRandom(seed);
    var tileTypeNoise = new SimplexNoise(randomGenerator.random);
    var tileSize = 32;
    var numTileColumns = mapSize;
    var numTileRows = mapSize;
    var layer1tileMat = util.makeMatrix(numTileRows);
    var layer2tileMat = util.makeMatrix(numTileRows);
    var layer1buffer = document.createElement("canvas");
    var layer1bufferContext;
    var layer2buffer = document.createElement("canvas");
    var layer2bufferContext;
    var position = {x: 0, y: 0};

    /*var overworldLayer1TileRange = [
        {rate: 0.15, val: 0}, // water
        {rate: 0.06, val: 1}, // sand
        {rate: 0.65, val: 2}, // grass
        {rate: 0.14, val: 3}, // dirt
    ];*/
    var overworldLayer1TileRange = [
        {rate: 0.25, val: 0}, // water
        {rate: 0.25, val: 1}, // sand
        {rate: 0.25, val: 2}, // grass
        {rate: 0.25, val: 3}  // dirt
    ];
    
    var overworldLayer2TileRange = [
        {rate: 0.75, val: 0}, // air
        {rate: 0.25, val: 4}  // something
    ];

    var tiles = [
        {color: "#0000ff"},
        {color: "#ffff00"},
        {color: "#00ff00"},
        {color: "#999920"},
        {color: "#000000"}
    ];

    var generate = function() {
        var val;
        var noiseZoom = 128;
        for (var row=0; row<numTileRows; ++row) {
            for (var col=0; col<numTileColumns; ++col) {
                // divide by 2 then add 0.5 to restrict the noise between [0, 1]
                val = tileTypeNoise.noise2D(row/noiseZoom, col/noiseZoom) * 0.5 + 0.5;
                layer1tileMat[row][col] = util.pickValueInRange(overworldLayer1TileRange, val);
                layer2tileMat[row][col] = util.pickValueInRange(overworldLayer2TileRange, 0);
            }
        }
    }

    var draw = function() {
        var tile;
        for (var row=0; row<numTileRows; ++row) {
            for (var col=0; col<numTileColumns; ++col) {
                tile = tiles[layer1tileMat[row][col]];
                layer1bufferContext.fillStyle = tile.color;
                layer1bufferContext.fillRect(col*tileSize, row*tileSize, tileSize, tileSize);

                if (layer2tileMat[row][col] > 0) {
                    tile = tiles[layer2tileMat[row][col]];
                    layer2bufferContext.fillStyle = tile.color;
                    layer2bufferContext.fillRect(col*tileSize, row*tileSize, tileSize, tileSize);
                }
            }
        }
    };

    layer1buffer.width = mapSize * tileSize;
    layer1buffer.height = mapSize * tileSize;
    layer1bufferContext = layer1buffer.getContext("2d");
    
    layer2buffer.width = mapSize * tileSize;
    layer2buffer.height = mapSize * tileSize;
    layer2bufferContext = layer2buffer.getContext("2d");

    return {
        draw: draw,
        generate: generate,
        layer1: layer1buffer,
        layer2: layer2buffer,
        position: position,
        tileSize: tileSize,
        size: mapSize
    };
}

module.exports = Map;

},{"./SeededRandom":2,"./SimplexNoise":3,"./util":5}],2:[function(require,module,exports){
// seedrandom.js version 2.0.
// Author: David Bau 4/2/2011
//
// Defines a method Math.seedrandom() that, when called, substitutes
// an explicitly seeded RC4-based algorithm for Math.random().  Also
// supports automatic seeding from local or network sources of entropy.
//
// Usage:
//
//   <script src=http://davidbau.com/encode/seedrandom-min.js></script>
//
//   Math.seedrandom('yipee'); Sets Math.random to a function that is
//                             initialized using the given explicit seed.
//
//   Math.seedrandom();        Sets Math.random to a function that is
//                             seeded using the current time, dom state,
//                             and other accumulated local entropy.
//                             The generated seed string is returned.
//
//   Math.seedrandom('yowza', true);
//                             Seeds using the given explicit seed mixed
//                             together with accumulated entropy.
//
//   <script src="http://bit.ly/srandom-512"></script>
//                             Seeds using physical random bits downloaded
//                             from random.org.
//
//   <script src="https://jsonlib.appspot.com/urandom?callback=Math.seedrandom">
//   </script>                 Seeds using urandom bits from call.jsonlib.com,
//                             which is faster than random.org.
//
// Examples:
//
//   Math.seedrandom("hello");            // Use "hello" as the seed.
//   document.write(Math.random());       // Always 0.5463663768140734
//   document.write(Math.random());       // Always 0.43973793770592234
//   var rng1 = Math.random;              // Remember the current prng.
//
//   var autoseed = Math.seedrandom();    // New prng with an automatic seed.
//   document.write(Math.random());       // Pretty much unpredictable.
//
//   Math.random = rng1;                  // Continue "hello" prng sequence.
//   document.write(Math.random());       // Always 0.554769432473455
//
//   Math.seedrandom(autoseed);           // Restart at the previous seed.
//   document.write(Math.random());       // Repeat the 'unpredictable' value.
//
// Notes:
//
// Each time seedrandom('arg') is called, entropy from the passed seed
// is accumulated in a pool to help generate future seeds for the
// zero-argument form of Math.seedrandom, so entropy can be injected over
// time by calling seedrandom with explicit data repeatedly.
//
// On speed - This javascript implementation of Math.random() is about
// 3-10x slower than the built-in Math.random() because it is not native
// code, but this is typically fast enough anyway.  Seeding is more expensive,
// especially if you use auto-seeding.  Some details (timings on Chrome 4):
//
// Our Math.random()            - avg less than 0.002 milliseconds per call
// seedrandom('explicit')       - avg less than 0.5 milliseconds per call
// seedrandom('explicit', true) - avg less than 2 milliseconds per call
// seedrandom()                 - avg about 38 milliseconds per call
//
// LICENSE (BSD):
//
// Copyright 2010 David Bau, all rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//   1. Redistributions of source code must retain the above copyright
//      notice, this list of conditions and the following disclaimer.
//
//   2. Redistributions in binary form must reproduce the above copyright
//      notice, this list of conditions and the following disclaimer in the
//      documentation and/or other materials provided with the distribution.
//
//   3. Neither the name of this module nor the names of its contributors may
//      be used to endorse or promote products derived from this software
//      without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
/**
 * All code is in an anonymous closure to keep the global namespace clean.
 *
 * @param {number=} overflow
 * @param {number=} startdenom
 */

var SeededRandom = (function (mySeed) {

  var pool = [],
      width = 256,
      chunks = 6,
      significance = 52,
      overflow,
      startdenom,
      newRandomGenerator;

  newRandomGenerator = {};
  newRandomGenerator.setSeed = function(seed, use_entropy) {
    var key = [];
    var arc4;

    // Flatten the seed string or build one from local entropy if needed.
    seed = mixkey(flatten(
      use_entropy ? [seed, pool] :
      arguments.length ? seed :
      [new Date().getTime(), pool, window], 3), key);

    // Use the seed to initialize an ARC4 generator.
    arc4 = new ARC4(key);

    // Mix the randomness into accumulated entropy.
    mixkey(arc4.S, pool);

    // Override Math.random

    // This function returns a random double in [0, 1) that contains
    // randomness in every bit of the mantissa of the IEEE 754 value.

    newRandomGenerator.random = function() {  // Closure to return a random double:
      var n = arc4.g(chunks);             // Start with a numerator n < 2 ^ 48
      var d = startdenom;                 //   and denominator d = 2 ^ 48.
      var x = 0;                          //   and no 'extra last byte'.
      while (n < significance) {          // Fill up all significant digits by
        n = (n + x) * width;              //   shifting numerator and
        d *= width;                       //   denominator and generating a
        x = arc4.g(1);                    //   new least-significant-byte.
      }
      while (n >= overflow) {             // To avoid rounding up, before adding
        n /= 2;                           //   last byte, shift everything
        d /= 2;                           //   right using integer math until
        x >>>= 1;                         //   we have exactly the desired bits.
      }
      return (n + x) / d;                 // Form the number within [0, 1).
    };

    // Return the seed that was used
    return seed;
  };

  //
  // ARC4
  //
  // An ARC4 implementation.  The constructor takes a key in the form of
  // an array of at most (width) integers that should be 0 <= x < (width).
  //
  // The g(count) method returns a pseudorandom integer that concatenates
  // the next (count) outputs from ARC4.  Its return value is a number x
  // that is in the range 0 <= x < (width ^ count).
  //
  /** @constructor */
  function ARC4(key) {
    var t, u, me = this, keylen = key.length;
    var i = 0, j = me.i = me.j = me.m = 0;
    me.S = [];
    me.c = [];

    // The empty key [] is treated as [0].
    if (!keylen) { key = [keylen++]; }

    // Set up S using the standard key scheduling algorithm.
    while (i < width) { me.S[i] = i++; }
    for (i = 0; i < width; i++) {
      t = me.S[i];
      j = lowbits(j + t + key[i % keylen]);
      u = me.S[j];
      me.S[i] = u;
      me.S[j] = t;
    }

    // The "g" method returns the next (count) outputs as one number.
    me.g = function getnext(count) {
      var s = me.S;
      var i = lowbits(me.i + 1); var t = s[i];
      var j = lowbits(me.j + t); var u = s[j];
      s[i] = u;
      s[j] = t;
      var r = s[lowbits(t + u)];
      while (--count) {
        i = lowbits(i + 1); t = s[i];
        j = lowbits(j + t); u = s[j];
        s[i] = u;
        s[j] = t;
        r = r * width + s[lowbits(t + u)];
      }
      me.i = i;
      me.j = j;
      return r;
    };
    // For robust unpredictability discard an initial batch of values.
    // See http://www.rsa.com/rsalabs/node.asp?id=2009
    me.g(width);
  }

  //
  // flatten()
  // Converts an object tree to nested arrays of strings.
  //
  /** @param {Object=} result
    * @param {string=} prop
    * @param {string=} typ */
  function flatten(obj, depth, result, prop, typ) {
    result = [];
    typ = typeof(obj);
    if (depth && typ == 'object') {
      for (prop in obj) {
        if (prop.indexOf('S') < 5) {    // Avoid FF3 bug (local/sessionStorage)
          try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
        }
      }
    }
    return (result.length ? result : obj + (typ != 'string' ? '\0' : ''));
  }

  //
  // mixkey()
  // Mixes a string seed into a key that is an array of integers, and
  // returns a shortened string seed that is equivalent to the result key.
  //
  /** @param {number=} smear
    * @param {number=} j */
  function mixkey(seed, key, smear, j) {
    seed += '';                         // Ensure the seed is a string
    smear = 0;
    for (j = 0; j < seed.length; j++) {
      key[lowbits(j)] =
        lowbits((smear ^= key[lowbits(j)] * 19) + seed.charCodeAt(j));
    }
    seed = '';
    for (j in key) { seed += String.fromCharCode(key[j]); }
    return seed;
  }

  //
  // lowbits()
  // A quick "n mod width" for width a power of 2.
  //
  function lowbits(n) {
    return n & (width - 1);
  }

  //
  // The following constants are related to IEEE 754 limits.
  //
  startdenom = Math.pow(width, chunks);
  significance = Math.pow(2, significance);
  overflow = significance * 2;

  //
  // When seedrandom.js is loaded, we immediately mix a few bits
  // from the built-in RNG into the entropy pool.  Because we do
  // not want to intefere with determinstic PRNG state later,
  // seedrandom will not call math.random on its own again after
  // initialization.
  //
  mixkey(Math.random(), pool);

  if (mySeed) {
    newRandomGenerator.setSeed(mySeed);
  }

  return newRandomGenerator;
});

if (module && module.exports) {
  module.exports = SeededRandom;
}

},{}],3:[function(require,module,exports){
/*! simplex-noise.js: copyright 2012 Jonas Wagner, licensed under a MIT license. See https://github.com/jwagner/simplex-noise.js for details */
(function(){function o(e){e||(e=Math.random),this.p=new Uint8Array(256),this.perm=new Uint8Array(512),this.permMod12=new Uint8Array(512);for(var t=0;t<256;t++)this.p[t]=e()*256;for(t=0;t<512;t++)this.perm[t]=this.p[t&255],this.permMod12[t]=this.perm[t]%12}var e=.5*(Math.sqrt(3)-1),t=(3-Math.sqrt(3))/6,n=1/3,r=1/6,i=(Math.sqrt(5)-1)/4,s=(5-Math.sqrt(5))/20;o.prototype={grad3:new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]),grad4:new Float32Array([0,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,1,0,1,1,1,0,1,-1,1,0,-1,1,1,0,-1,-1,-1,0,1,1,-1,0,1,-1,-1,0,-1,1,-1,0,-1,-1,1,1,0,1,1,1,0,-1,1,-1,0,1,1,-1,0,-1,-1,1,0,1,-1,1,0,-1,-1,-1,0,1,-1,-1,0,-1,1,1,1,0,1,1,-1,0,1,-1,1,0,1,-1,-1,0,-1,1,1,0,-1,1,-1,0,-1,-1,1,0,-1,-1,-1,0]),noise2D:function(n,r){var i=this.permMod12,s=this.perm,o=this.grad3,u,a,f,l=(n+r)*e,c=Math.floor(n+l),h=Math.floor(r+l),p=(c+h)*t,d=c-p,v=h-p,m=n-d,g=r-v,y,b;m>g?(y=1,b=0):(y=0,b=1);var w=m-y+t,E=g-b+t,S=m-1+2*t,x=g-1+2*t,T=c&255,N=h&255,C=.5-m*m-g*g;if(C<0)u=0;else{var k=i[T+s[N]]*3;C*=C,u=C*C*(o[k]*m+o[k+1]*g)}var L=.5-w*w-E*E;if(L<0)a=0;else{var A=i[T+y+s[N+b]]*3;L*=L,a=L*L*(o[A]*w+o[A+1]*E)}var O=.5-S*S-x*x;if(O<0)f=0;else{var M=i[T+1+s[N+1]]*3;O*=O,f=O*O*(o[M]*S+o[M+1]*x)}return 70*(u+a+f)},noise3D:function(e,t,i){var s=this.permMod12,o=this.perm,u=this.grad3,a,f,l,c,h=(e+t+i)*n,p=Math.floor(e+h),d=Math.floor(t+h),v=Math.floor(i+h),m=(p+d+v)*r,g=p-m,y=d-m,b=v-m,w=e-g,E=t-y,S=i-b,x,T,N,C,k,L;w<E?E<S?(x=0,T=0,N=1,C=0,k=1,L=1):w<S?(x=0,T=1,N=0,C=0,k=1,L=1):(x=0,T=1,N=0,C=1,k=1,L=0):E<S?w<S?(x=0,T=0,N=1,C=1,k=0,L=1):(x=1,T=0,N=0,C=1,k=0,L=1):(x=1,T=0,N=0,C=1,k=1,L=0);var A=w-x+r,O=E-T+r,M=S-N+r,_=w-C+2*r,D=E-k+2*r,P=S-L+2*r,H=w-1+3*r,B=E-1+3*r,j=S-1+3*r,F=p&255,I=d&255,q=v&255,R=.6-w*w-E*E-S*S;if(R<0)a=0;else{var U=s[F+o[I+o[q]]]*3;R*=R,a=R*R*(u[U]*w+u[U+1]*E+u[U+2]*S)}var z=.6-A*A-O*O-M*M;if(z<0)f=0;else{var W=s[F+x+o[I+T+o[q+N]]]*3;z*=z,f=z*z*(u[W]*A+u[W+1]*O+u[W+2]*M)}var X=.6-_*_-D*D-P*P;if(X<0)l=0;else{var V=s[F+C+o[I+k+o[q+L]]]*3;X*=X,l=X*X*(u[V]*_+u[V+1]*D+u[V+2]*P)}var $=.6-H*H-B*B-j*j;if($<0)c=0;else{var J=s[F+1+o[I+1+o[q+1]]]*3;$*=$,c=$*$*(u[J]*H+u[J+1]*B+u[J+2]*j)}return 32*(a+f+l+c)},noise4D:function(e,t,n,r){var o=this.permMod12,u=this.perm,a=this.grad4,f,l,c,h,p,d=(e+t+n+r)*i,v=Math.floor(e+d),m=Math.floor(t+d),g=Math.floor(n+d),y=Math.floor(r+d),b=(v+m+g+y)*s,w=v-b,E=m-b,S=g-b,x=y-b,T=e-w,N=t-E,C=n-S,k=r-x,L=0,A=0,O=0,M=0;T>N?L++:A++,T>C?L++:O++,T>k?L++:M++,N>C?A++:O++,N>k?A++:M++,C>k?O++:M++;var _,D,P,H,B,j,F,I,q,R,U,z;_=L<3?0:1,D=A<3?0:1,P=O<3?0:1,H=M<3?0:1,B=L<2?0:1,j=A<2?0:1,F=O<2?0:1,I=M<2?0:1,q=L<1?0:1,R=A<1?0:1,U=O<1?0:1,z=M<1?0:1;var W=T-_+s,X=N-D+s,V=C-P+s,$=k-H+s,J=T-B+2*s,K=N-j+2*s,Q=C-F+2*s,G=k-I+2*s,Y=T-q+3*s,Z=N-R+3*s,et=C-U+3*s,tt=k-z+3*s,nt=T-1+4*s,rt=N-1+4*s,it=C-1+4*s,st=k-1+4*s,ot=v&255,ut=m&255,at=g&255,ft=y&255,lt=.6-T*T-N*N-C*C-k*k;if(lt<0)f=0;else{var ct=u[ot+u[ut+u[at+u[ft]]]]%32*4;lt*=lt,f=lt*lt*(a[ct]*T+a[ct+1]*N+a[ct+2]*C+a[ct+3]*k)}var ht=.6-W*W-X*X-V*V-$*$;if(ht<0)l=0;else{var pt=u[ot+_+u[ut+D+u[at+P+u[ft+H]]]]%32*4;ht*=ht,l=ht*ht*(a[pt]*W+a[pt+1]*X+a[pt+2]*V+a[pt+3]*$)}var dt=.6-J*J-K*K-Q*Q-G*G;if(dt<0)c=0;else{var vt=u[ot+B+u[ut+j+u[at+F+u[ft+I]]]]%32*4;dt*=dt,c=dt*dt*(a[vt]*J+a[vt+1]*K+a[vt+2]*Q+a[vt+3]*G)}var mt=.6-Y*Y-Z*Z-et*et-tt*tt;if(mt<0)h=0;else{var gt=u[ot+q+u[ut+R+u[at+U+u[ft+z]]]]%32*4;mt*=mt,h=mt*mt*(a[gt]*Y+a[gt+1]*Z+a[gt+2]*et+a[gt+3]*tt)}var yt=.6-nt*nt-rt*rt-it*it-st*st;if(yt<0)p=0;else{var bt=u[ot+1+u[ut+1+u[at+1+u[ft+1]]]]%32*4;yt*=yt,p=yt*yt*(a[bt]*nt+a[bt+1]*rt+a[bt+2]*it+a[bt+3]*st)}return 27*(f+l+c+h+p)}},typeof define!="undefined"&&define.amd?define(function(){return o}):typeof window!="undefined"&&(window.SimplexNoise=o),typeof exports!="undefined"&&(exports.SimplexNoise=o),typeof module!="undefined"&&(module.exports=o)})();
},{}],4:[function(require,module,exports){
var util = require("./util");
var Map = require("./Map");

var listen = util.listen;

var canvasSize = {
    width: window.innerWidth,
    height: window.innerHeight
};
var canvas = document.createElement("canvas");
var ctx;
var randomSeed = Math.random();
var map = Map(randomSeed, 80);
var mouseDown = false;
var mouseDownPt;
var mapPositionOnDown;
var upscale = 2;

function drawMap() {
    // element, imgX, imgY, imgWidth, imgHeight, posX, posY, stretchX, stretchY
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(map.layer1, map.position.x, map.position.y, canvasSize.width,
        canvasSize.height, 0, 0, canvasSize.width, canvasSize.height);
    ctx.drawImage(map.layer2, map.position.x, map.position.y, canvasSize.width,
        canvasSize.height, 0, 0, canvasSize.width, canvasSize.height);
}

function downHandler(e) {
    if (navigator.userAgent.match(/Android/i)) {
        e.preventDefault();
    }
    var x = e.pageX;
    var y = e.pageY;
    if (e.targetTouches) {
        x = e.targetTouches[0].pageX;
        y = e.targetTouches[0].pageY;
    }
    mouseDown = true;
    mouseDownPt = {x: x, y: y};
    mapPositionOnDown = {
        x: map.position.x,
        y: map.position.y
    };
}

function upHandler(e) {
    mouseDown = false;
}

function moveHandler(e) {
    if (navigator.userAgent.match(/Android/i)) {
        e.preventDefault();
    }
    if (!mouseDown) {
        e.preventDefault();
        return false;
    }

    var x = e.pageX;
    var y = e.pageY;
    if (e.targetTouches) {
        x = e.targetTouches[0].pageX;
        y = e.targetTouches[0].pageY;
    }

    var dx = (x - mouseDownPt.x) / upscale;
    var dy = (y - mouseDownPt.y) / upscale;

    var mapImageSize = map.tileSize * map.size;
    map.position.x = util.clamp(mapPositionOnDown.x - dx, 0, mapImageSize - canvasSize.width / upscale);
    map.position.y = util.clamp(mapPositionOnDown.y - dy, 0, mapImageSize - canvasSize.height / upscale);

    drawMap();
}

canvas.width = canvasSize.width / upscale;
canvas.height = canvasSize.height / upscale;
canvas.style.width = canvasSize.width + "px";
canvas.style.height = canvasSize.height + "px";
ctx = canvas.getContext("2d");
document.body.appendChild(canvas);

map.generate();
map.draw();


if ('ontouchstart' in document.documentElement) {
    listen(document, "touchstart", downHandler);
    listen(document, "touchend", upHandler);
    listen(document, "touchmove", moveHandler);
} else {
    listen(document, "mousedown", downHandler);
    listen(document, "mouseup", upHandler);
    listen(document, "mousemove", moveHandler);
}

drawMap();

},{"./Map":1,"./util":5}],5:[function(require,module,exports){
function $(query) {
    return document.querySelector(query);
}

function listen(ele, type, handler) {
    ele.addEventListener(type, handler, false);
}

function makeMatrix(width) {
    var mat = [];
    for (var t=0; t<width; ++t) {
        mat[t] = [];
    }
    return mat;
}

function pickValueInRange(rangeObjs, value) {
    var numRangeObjs = rangeObjs.length;
    var offsetRange = 0;
    var rangeObj;
    for (var t=0; t<numRangeObjs; ++t) {
        rangeObj = rangeObjs[t];
        if (value <= offsetRange + rangeObj.rate) {
            return rangeObj.val;
        } else {
            offsetRange += rangeObj.rate;
        }
    }
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

module.exports = {
    $: $,
    listen: listen,
    makeMatrix: makeMatrix,
    pickValueInRange: pickValueInRange,
    clamp: clamp
}

},{}]},{},[4])
;