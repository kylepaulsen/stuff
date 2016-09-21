
THREE.models = THREE.models || {};

(function() {
    THREE.models.loadPromises = THREE.models.loadPromises || [];
    THREE.models.JSONLoader = THREE.models.JSONLoader || new THREE.JSONLoader();
    var treeMesh;
    var loadDeferred = D.defer();
    THREE.models.loadPromises.push(loadDeferred.promise);

    var treeTexture = THREE.ImageUtils.loadTexture('textures/tree.png');
    THREE.models.JSONLoader.load('models/tree.js', function(object) {
        treeMesh = new THREE.Mesh(object, new THREE.MeshBasicMaterial({map: treeTexture}));
        treeMesh.scale.set(0.4, 0.4, 0.4);
        loadDeferred.resolve();
    });

    THREE.models.Tree = function(x, y, z) {
        var newTree = treeMesh.clone();
        newTree.position.set(x, y, z);
        return newTree;
    };
})();
