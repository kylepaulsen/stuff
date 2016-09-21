
THREE.VoxelWorld = function(scene, seed) {
    var middleChunk = {x: 9999, z: 9999};
    var chunkSize = 32;
    var chunkGroupSize = 5;
    var landAmplitude = 15;
    var voxelSize = 1;
    var activeChunks = [];
    var meshes = {};

    var randomGenerator = new THREE.SeededRandom(seed);
    var voxelHeightNoise = new THREE.PerlinNoise(randomGenerator, 40, 40, 3.14159);
    var rocksNoise = new THREE.PerlinNoise(randomGenerator, 10, 10, 3.14159);

    var texture = THREE.ImageUtils.loadTexture('textures/terrain.png');
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;//THREE.LinearMipMapLinearFilter;

    var makeChunk = function(chunkX, chunkZ, cb) {
        var blockPos = {x: chunkSize, z: chunkSize};
        var blockOffset = {x: chunkX * chunkSize, z: chunkZ * chunkSize};
        var geom = new THREE.Geometry();
        var vertIndices = {};
        vertIndices.length = 0;

        var putVert = function(x, y, z) {
            var vertId = x+","+y+","+z;
            if (vertIndices[vertId] === undefined) {
                vertIndices[vertId] = vertIndices.length++;
                geom.vertices.push(new THREE.Vector3(x, y, z));
            }
            return vertIndices[vertId];
        };

        var addFace = function(corners, normal) {
            var face = new THREE.Face3(corners[0], corners[1], corners[2]);
            face.normal.set(normal[0], normal[1], normal[2]);
            geom.faces.push(face);
            face = new THREE.Face3(corners[1], corners[3], corners[2]);
            face.normal.set(normal[0], normal[1], normal[2]);
            geom.faces.push(face);
        };

        var applyTexture = function(id) {
            var step = 0.0625;
            var u = (id % 16) * step;
            var v = 1 - (Math.floor(id / 16) * step);
            var corners = [];
            corners[0] = new THREE.Vector2(u, v-step);
            corners[1] = new THREE.Vector2(u, v);
            corners[2] = new THREE.Vector2(u+step, v-step);
            corners[3] = new THREE.Vector2(u+step, v);
            geom.faceVertexUvs[0].push([corners[0], corners[1], corners[2]]);
            geom.faceVertexUvs[0].push([corners[1], corners[3], corners[2]]);
        };

        var getBlockTextureType = function(x, z, wall) {
            var y = getHeight(x, z);
            var wallConversions = {
                "0": 126
            };
            var textureType = 0;

            if (y < 4 * voxelSize) {
                textureType = 18;
            }

            if (rocksNoise.getHeight(x, z) > 0.8) {
                textureType = 19;
            }

            if (wall && wallConversions[textureType]) {
                textureType = wallConversions[textureType];
            }
            return textureType;
        };

        var getHeight = function(x, z) {
            return Math.floor(voxelHeightNoise.getHeight(x, z) * landAmplitude) * voxelSize;
        };

        //while (blockPos.z-- > 0) {
        var makeRow = function(z) {
            while (blockPos.x-- > 0) {
                var corners = [];
                var normalDirection;
                var textureType = 0;

                // main surface
                var globalBlockPos = {x: blockPos.x + blockOffset.x, y: 0, z: z + blockOffset.z};
                var curHeight = getHeight(globalBlockPos.x, globalBlockPos.z);

                corners[0] = putVert(blockPos.x * voxelSize, curHeight, z * voxelSize);
                corners[1] = putVert(blockPos.x * voxelSize, curHeight, (z+1) * voxelSize);
                corners[2] = putVert((blockPos.x+1) * voxelSize, curHeight, z * voxelSize);
                corners[3] = putVert((blockPos.x+1) * voxelSize, curHeight, (z+1) * voxelSize);

                addFace(corners, [0, 1, 0]);
                applyTexture(getBlockTextureType(globalBlockPos.x, globalBlockPos.z));

                // south wall
                var sHeight = getHeight(globalBlockPos.x, globalBlockPos.z + 1);
                if (sHeight !== curHeight) {
                    corners[0] = putVert(blockPos.x * voxelSize, curHeight, (z+1) * voxelSize);
                    corners[1] = putVert(blockPos.x * voxelSize, sHeight, (z+1) * voxelSize);
                    corners[2] = putVert((blockPos.x+1) * voxelSize, curHeight, (z+1) * voxelSize);
                    corners[3] = putVert((blockPos.x+1) * voxelSize, sHeight, (z+1) * voxelSize);

                    if (sHeight > curHeight) {
                        normalDirection = -1;
                        textureType = getBlockTextureType(globalBlockPos.x, globalBlockPos.z + 1, true);
                    } else {
                        normalDirection = 1;
                        textureType = getBlockTextureType(globalBlockPos.x, globalBlockPos.z, true);
                    }
                    addFace(corners, [0, 0, normalDirection]);
                    applyTexture(textureType);
                }

                // east wall
                var eHeight = getHeight(globalBlockPos.x + 1, globalBlockPos.z);
                if (eHeight !== curHeight) {
                    corners[0] = putVert((blockPos.x+1) * voxelSize, curHeight, (z+1) * voxelSize);
                    corners[1] = putVert((blockPos.x+1) * voxelSize, eHeight, (z+1) * voxelSize);
                    corners[2] = putVert((blockPos.x+1) * voxelSize, curHeight, z * voxelSize);
                    corners[3] = putVert((blockPos.x+1) * voxelSize, eHeight, z * voxelSize);

                    if (eHeight > curHeight) {
                        normalDirection = -1;
                        textureType = getBlockTextureType(globalBlockPos.x + 1, globalBlockPos.z, true);
                    } else {
                        normalDirection = 1;
                        textureType = getBlockTextureType(globalBlockPos.x, globalBlockPos.z, true);
                    }
                    addFace(corners, [normalDirection, 0, 0]);
                    applyTexture(textureType);
                }
            }
            blockPos.x = chunkSize;
            if (z-- > 0) {
                setTimeout(function() {makeRow(z);}, 0);
                //makeRow(z);
            } else {
                cb(new THREE.Mesh(geom, new THREE.MeshLambertMaterial({map: texture, shininess: 0})));
            }
        };
        makeRow(blockPos.z);

        delete vertIndices;
        //return new THREE.Mesh(geom, new THREE.MeshBasicMaterial({wireframe: true, color: 0xff0000}));
        //return new THREE.Mesh(geom, new THREE.MeshBasicMaterial({map: texture}));
        return new THREE.Mesh(geom, new THREE.MeshLambertMaterial({map: texture, shininess: 0}));
    };

    var getChunkGroup = function(x, z) {
        var chunks = [];
        var half = Math.floor(chunkGroupSize / 2);
        var max = chunkGroupSize-half-1;
        var min = -half;
        for (var dx = min; dx <= max; ++dx) {
            for (var dz = min; dz <= max; ++dz) {
                chunks.push((x + dx) + "," + (z + dz));
            }
        }
        return chunks;
    };

    var setMiddleChunk = function(x, z) {
        if (x === middleChunk.x && z === middleChunk.z) {
            return;
        }
        middleChunk.x = x;
        middleChunk.z = z;

        var newActiveChunks = getChunkGroup(x, z);
        var chunksToRemove = _.difference(activeChunks, newActiveChunks);
        var chunksToMake = _.difference(newActiveChunks, activeChunks);

        var t = chunksToRemove.length;
        console.log(chunksToRemove, meshes);
        while (t-- > 0) {
            scene.remove(meshes[chunksToRemove[t]]);
            delete meshes[chunksToRemove[t]];
        }

        t = chunksToMake.length;
        while (t-- > 0) {
            var newChunkCoord = chunksToMake[t].split(",");
            (function(newChunkCoord) {
                makeChunk(newChunkCoord[0], newChunkCoord[1], function(newChunk) {
                    console.log("ADDING CHUNK! ", newChunkCoord);
                    newChunk.position.x = newChunkCoord[0] * chunkSize * voxelSize;
                    newChunk.position.z = newChunkCoord[1] * chunkSize * voxelSize;
                    scene.add(newChunk);
                    meshes[newChunkCoord[0]+","+newChunkCoord[1]] = newChunk;
                });
            })(newChunkCoord);
        }

        activeChunks = newActiveChunks;
    };

    setMiddleChunk(0, 0);

    return {
        setMiddleChunk: setMiddleChunk,
        chunkSize: chunkSize
    };
};
