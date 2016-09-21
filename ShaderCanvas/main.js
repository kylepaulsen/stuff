(function() {
    "use strict";

    var lineWidgets = [];
    var errorLineOffset = 0;
    var doneSettingUpEditor = false;
    var qualitySlider = $("#quality");

    var modal = picoModal({
        content: $("#modal")[0],
        autoOpen: false,
        width: window.innerWidth * 0.8
    });

    $("#modal").css("height", window.innerHeight*0.8);

    $("#runBtn").click(function() {
        compileShaderAndDraw();
    });

    $("#edit").click(function() {
        modal.open();
        if (!doneSettingUpEditor) {
            setupEditor();
            doneSettingUpEditor = true;
        }
    });

    qualitySlider.change(_.throttle(function () {
        shaderCanvas.setQuality(qualitySlider.val() / 100);
    }, 500));

    $(window).resize(_.throttle(function() {
        shaderCanvas.setDimensions(window.innerWidth, window.innerHeight);
    }, 100));

    function setupEditor() {
        codeMirror.refresh();
        $("#quality").val(100);
        codeMirror.setValue(defaultFragmentShader);
    }

    function lookForErrors(problems) {
        var lines = problems.split("\n");
        _.each(lines, function(line) {
            var lineParts = line.split(":");
            var problemType = lineParts[0];
            var lineNumber = lineParts[2];
            var problemText = lineParts[3] + ' ' + lineParts[4];

            if (problemType && lineNumber && problemText) {
                var widgetElement = document.createElement('div');
                widgetElement.className = "problem";
                widgetElement.style.color = "#ff0000";
                widgetElement.innerHTML = "<b>"+problemType+"</b>: "+problemText;

                lineWidgets.push(codeMirror.addLineWidget(lineNumber-1-errorLineOffset, widgetElement));
            }
        });
        codeMirror.refresh();
    }

    function getShaderCode() {
        var shader = codeMirror.getValue();
        errorLineOffset = 0;
        if (!shader.match(/precision+(\s+)+highp+(\s+)+float/i)) {
            shader = "#ifdef GL_ES\nprecision highp float;\n#endif\n" + shader;
            errorLineOffset = 3;
        }
        return shader;
    }

    function compileShaderAndDraw() {
        _.each(lineWidgets, function(widget) {
            codeMirror.removeLineWidget(widget);
        });
        lineWidgets = [];
        var code = getShaderCode();
        shaderCanvas.setFragmentShader(code);
        var problem = shaderCanvas.compileShaders();
        if (!problem) {
            shaderCanvas.draw();
            modal.close();
        } else {
            lookForErrors(problem);
        }
    }

    var codeMirror = CodeMirror($("#editor")[0], {
        value: '',
        mode: "text/x-glsl",
        lineNumbers: true,
        matchBrackets: true,
        indentWithTabs: true,
        tabSize: 4,
        indentUnit: 4
    });

    var shaderCanvas = new ShaderCanvas({
        width: window.innerWidth,
        height: window.innerHeight,
        container: document.body
    });

    var defaultFragmentShader = $("#defaultShader2").text();

    codeMirror.setValue(defaultFragmentShader);
    compileShaderAndDraw();
    shaderCanvas.animate();
})();
