
THREE.VoxelWorld = function(scene, seed) {
    var middleChunk = {x: 9999, z: 9999};
    var chunkSize = 32;
    var chunkGroupSize = 5;
    var noLoadZoneSize = 1;
    var keepZoneSize = window.isMobile ? 13 : 21;
    var landAmplitude = 20;
    var voxelSize = 1;
    var meshes = {};
    var waterMeshes = {};
    var sandHeight = 6 * voxelSize;

    var randomGenerator = new THREE.SeededRandom(seed);
    var voxelHeightNoise = new THREE.PerlinNoise(randomGenerator, 50, 50, 3.14159);
    var rocksNoise = new THREE.PerlinNoise(randomGenerator, 10, 10, 3.14159);

    var terrainTexture = THREE.ImageUtils.loadTexture('textures/terrain.png');
    var waterTexture = THREE.ImageUtils.loadTexture('textures/water.png');

    terrainTexture.magFilter = THREE.NearestFilter;
    terrainTexture.minFilter = THREE.NearestFilter;//THREE.LinearMipMapLinearFilter;

    var parseChunkCoords = function(id) {
        var coords = id.split(",");
        return {
            x: coords[0],
            z: coords[1]
        };
    };

    var makeChunk = function(chunkX, chunkZ) {
        var blockGridPos = {x: chunkSize, z: chunkSize};
        var blockGridOffset = {x: chunkX * chunkSize, z: chunkZ * chunkSize};
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
            var textureTypes = {
                grass: 0,
                dirt: 126,
                sand: 18,
                rock: 19
            }
            var wallConversions = {}
            wallConversions[textureTypes.grass] = textureTypes.dirt;

            var textureType = textureTypes.grass;

            if (y < sandHeight) {
                textureType = textureTypes.sand;
            }

            if (rocksNoise.getHeight(x, z) > 0.8) {
                textureType = textureTypes.rock;
            }

            if (wall && wallConversions[textureType]) {
                textureType = wallConversions[textureType];
            }
            return textureType;
        };

        var getHeight = function(x, z) {
            return Math.floor(voxelHeightNoise.getHeight(x, z) * landAmplitude) * voxelSize;
        };

        while (blockGridPos.z-- > 0) {
            while (blockGridPos.x-- > 0) {
                var corners = [];
                var normalDirection;
                var textureType = 0;

                // x, z coords of block in the grid of blocks (whole numbers)
                var globalBlockGridPos = {x: blockGridPos.x + blockGridOffset.x, z: blockGridPos.z + blockGridOffset.z};
                // y coord of block in global opengl space
                var curHeight = getHeight(globalBlockGridPos.x, globalBlockGridPos.z);
                // x, z coords of block in global opengl space
                var globalBlockPos = {x: globalBlockGridPos.x * voxelSize, z: globalBlockGridPos.z * voxelSize};
                // x, z coords of block in chunk opengl space
                var chunkBlockPos = {x: blockGridPos.x * voxelSize, z: blockGridPos.z * voxelSize};

                // main surface
                corners[0] = putVert(chunkBlockPos.x, curHeight, chunkBlockPos.z);
                corners[1] = putVert(chunkBlockPos.x, curHeight, chunkBlockPos.z + voxelSize);
                corners[2] = putVert(chunkBlockPos.x + voxelSize, curHeight, chunkBlockPos.z);
                corners[3] = putVert(chunkBlockPos.x + voxelSize, curHeight, chunkBlockPos.z + voxelSize);

                addFace(corners, [0, 1, 0]);
                applyTexture(getBlockTextureType(globalBlockGridPos.x, globalBlockGridPos.z));

                // south wall
                var sHeight = getHeight(globalBlockGridPos.x, globalBlockGridPos.z + 1);
                if (sHeight !== curHeight) {
                    corners[0] = putVert(chunkBlockPos.x, curHeight, chunkBlockPos.z + voxelSize);
                    corners[1] = putVert(chunkBlockPos.x, sHeight, chunkBlockPos.z + voxelSize);
                    corners[2] = putVert(chunkBlockPos.x + voxelSize, curHeight, chunkBlockPos.z + voxelSize);
                    corners[3] = putVert(chunkBlockPos.x + voxelSize, sHeight, chunkBlockPos.z + voxelSize);

                    if (sHeight > curHeight) {
                        normalDirection = -1;
                        textureType = getBlockTextureType(globalBlockGridPos.x, globalBlockGridPos.z + 1, true);
                    } else {
                        normalDirection = 1;
                        textureType = getBlockTextureType(globalBlockGridPos.x, globalBlockGridPos.z, true);
                    }
                    addFace(corners, [0, 0, normalDirection]);
                    applyTexture(textureType);
                }

                // east wall
                var eHeight = getHeight(globalBlockGridPos.x + 1, globalBlockGridPos.z);
                if (eHeight !== curHeight) {
                    corners[0] = putVert(chunkBlockPos.x + voxelSize, curHeight, chunkBlockPos.z + voxelSize);
                    corners[1] = putVert(chunkBlockPos.x + voxelSize, eHeight, chunkBlockPos.z + voxelSize);
                    corners[2] = putVert(chunkBlockPos.x + voxelSize, curHeight, chunkBlockPos.z);
                    corners[3] = putVert(chunkBlockPos.x + voxelSize, eHeight, chunkBlockPos.z);

                    if (eHeight > curHeight) {
                        normalDirection = -1;
                        textureType = getBlockTextureType(globalBlockGridPos.x + 1, globalBlockGridPos.z, true);
                    } else {
                        normalDirection = 1;
                        textureType = getBlockTextureType(globalBlockGridPos.x, globalBlockGridPos.z, true);
                    }
                    addFace(corners, [normalDirection, 0, 0]);
                    applyTexture(textureType);
                }

                // add other features to this block
                if (curHeight >= sandHeight && randomGenerator.random() < 0.005) {
                    var treePos = {
                        x: globalBlockGridPos.x * voxelSize + voxelSize / 2,
                        y: curHeight,
                        z: globalBlockGridPos.z * voxelSize + voxelSize / 2
                    }
                    scene.add(new THREE.models.Tree(treePos.x, treePos.y, treePos.z));
                }
            }
            blockGridPos.x = chunkSize;
        }

        delete vertIndices;
        //return new THREE.Mesh(geom, new THREE.MeshBasicMaterial({wireframe: true, color: 0xff0000}));
        //return new THREE.Mesh(geom, new THREE.MeshBasicMaterial({map: terrainTexture}));
        return new THREE.Mesh(geom, new THREE.MeshLambertMaterial({map: terrainTexture, shininess: 0}));
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

    var findAndRemoveChunksOutsideKeepZone = function(activeChunkX, activeChunkZ) {
        var loadedChunks = Object.keys(meshes);
        var t = loadedChunks.length;
        var keepZone = keepZoneSize / 2;
        var outsideChunks = [];
        while(t-- > 0) {
            var chunkId = loadedChunks[t];
            var chunkCoords = parseChunkCoords(chunkId);
            if (Math.abs(chunkCoords.x - activeChunkX) > keepZone ||
                Math.abs(chunkCoords.z - activeChunkZ) > keepZone) {
                scene.remove(meshes[chunkId]);
                scene.remove(waterMeshes[chunkId]);
                delete meshes[chunkId];
                delete waterMeshes[chunkId];
            }
        }
    }

    var makeWaterLevel = function(x, z) {
        var size = chunkSize * voxelSize;
        var waterGeometry = new THREE.PlaneGeometry(size, size);
        waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
        waterTexture.repeat.set(chunkSize, chunkSize);
        var mesh = new THREE.Mesh(waterGeometry, new THREE.MeshBasicMaterial({map: waterTexture, transparent: true, opacity: 0.7}));
        mesh.rotateX(-Math.PI/2);
        mesh.position.y = 4.5;
        mesh.position.x = x * size + (chunkSize / 2);
        mesh.position.z = z * size + (chunkSize / 2);
        waterMeshes[x+","+z] = mesh;
        return mesh;
    };

    var setMiddleChunk = function(x, z) {
        if (Math.abs(x - middleChunk.x) < (noLoadZoneSize / 2) &&
            Math.abs(z - middleChunk.z) < (noLoadZoneSize / 2)) {
            // we are in the "no-load" zone.
            return;
        }
        middleChunk.x = x;
        middleChunk.z = z;

        var activeChunks = getChunkGroup(x, z);
        var t = activeChunks.length;

        findAndRemoveChunksOutsideKeepZone(x, z);

        var makeUnmadeChunks = function(chunksToMake, t) {
            if (t < 0) {
                return;
            }
            var chunkId = chunksToMake[t];
            if (!meshes[chunkId]) {
                console.log("Making new chunk: " + chunkId);
                var newChunkCoord = parseChunkCoords(chunkId);
                var newChunk = makeChunk(newChunkCoord.x, newChunkCoord.z);
                newChunk.position.x = newChunkCoord.x * chunkSize * voxelSize;
                newChunk.position.z = newChunkCoord.z * chunkSize * voxelSize;
                scene.add(newChunk);
                scene.add(makeWaterLevel(newChunkCoord.x, newChunkCoord.z));
                meshes[chunkId] = newChunk;
                setTimeout(function() {
                    makeUnmadeChunks(chunksToMake, --t);
                }, 50);
            } else {
                makeUnmadeChunks(chunksToMake, --t)
            }
        };
        makeUnmadeChunks(activeChunks, --t);
    };

    setMiddleChunk(0, 0);

    return {
        setMiddleChunk: setMiddleChunk,
        chunkSize: chunkSize
    };
};
