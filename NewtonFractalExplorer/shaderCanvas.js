const makeShaderCanvas = (canvas, options = {}) => {
	const { width, height } = canvas;
	const gl = canvas.getContext('webgl', { preserveDrawingBuffer: options.preserveDrawingBuffer });
	const positionVerts = [-1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
	const textureCoords = [0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0];
	const initTime = Date.now();

	const positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionVerts), gl.STATIC_DRAW);

	// Map the corners of the texture to our quad.
	const textureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);

	gl.viewport(0, 0, width, height);
	gl.clearColor(0, 0, 0, 1.0);

	const numVerts = positionVerts.length / 2;

	const prepareShader = (shaderProgram, opts = {}) => {
		gl.useProgram(shaderProgram);

		const positionAttrLocation = gl.getAttribLocation(shaderProgram, opts.positionAttribute || 'a_position');
		if (positionAttrLocation !== null) {
			// Turn on the position attribute
			gl.enableVertexAttribArray(positionAttrLocation);
			// Bind the position buffer.
			gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
			// Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
			gl.vertexAttribPointer(
				positionAttrLocation,
				2, // size (2 floats per vertex)
				gl.FLOAT, // type (32bit floats)
				false, // normalize
				0, // stride (bytes per vertex, ignored if 0)
				0 // offset (byte offset in stride to read data, ignored if 0)
			);
		}

		const textureCoordAttrLocation = gl.getAttribLocation(shaderProgram, opts.textureAttribute || 'a_texCoord');
		if (textureCoordAttrLocation !== null) {
			// Turn on the texcoord attribute
			gl.enableVertexAttribArray(textureCoordAttrLocation);

			// bind the texcoord buffer.
			gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

			// Tell the texcoord attribute how to get data out of texcoordBuffer (ARRAY_BUFFER)
			// location, size, type, normalize, stride, offset
			gl.vertexAttribPointer(textureCoordAttrLocation, 2, gl.FLOAT, false, 0, 0);
		}

		const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, 'u_resolution');
		if (resolutionUniformLocation !== null) {
			gl.uniform2f(resolutionUniformLocation, width, height);
		}

		const timeUniformLocation = gl.getUniformLocation(shaderProgram, 'u_time');
		if (timeUniformLocation !== null) {
			// set time since mount
			gl.uniform1f(
				timeUniformLocation,
				(Date.now() - initTime) / 1000
			);
		}
	};

	const render = (frameBuffer = null) => {
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.drawArrays(gl.TRIANGLES, 0, numVerts);
	};

	const defaultVertexShader = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;

        varying vec2 v_position;
        varying vec2 v_texCoord;

        void main() {
            v_texCoord = a_texCoord;
            // map coord space from [-1, 1] -> [0, 1]
            v_position = (a_position + 1.) / 2.;
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

	const createShader = (shaderSource, shaderType) => {
		// Create the shader object
		const shader = gl.createShader(shaderType);

		// Set the shader source code.
		gl.shaderSource(shader, shaderSource);

		// Compile the shader
		gl.compileShader(shader);

		// Check if it compiled
		const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (!success) {
			// Something went wrong during compilation; get the error
			throw new Error(`could not compile shader: ${gl.getShaderInfoLog(shader)}`);
		}

		return shader;
	};

	const createVertexShader = (shaderSource) => createShader(shaderSource, gl.VERTEX_SHADER);
	const createFragmentShader = (shaderSource) => createShader(shaderSource, gl.FRAGMENT_SHADER);

	const createShaderProgram = (vertexShader, fragmentShader) => {
		// create a program.
		const program = gl.createProgram();

		// attach the shaders.
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);

		// link the program.
		gl.linkProgram(program);

		// Check if it linked.
		const success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (!success) {
			// something went wrong with the link
			throw new Error(`program failed to link: ${gl.getProgramInfoLog(program)}`);
		}

		return program;
	};

	const createShaderProgramFromSource = (fragmentShaderSrc, vertexShaderSrc) => {
		const vertShader = createVertexShader(vertexShaderSrc || defaultVertexShader);
		const fragShader = createFragmentShader(fragmentShaderSrc);
		return createShaderProgram(vertShader, fragShader);
	};

	const setShaderUniform = (shaderProgram, uniformSetFn, uniformName, ...uniformValueArgs) => {
		const uniformLocation = gl.getUniformLocation(shaderProgram, uniformName);
		if (uniformLocation !== null) {
			gl[uniformSetFn](uniformLocation, ...uniformValueArgs);
		}
	};

	const createFrameBuffer = (fWidth, fHeight) => {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);

		// Set up texture so we can render any size image and so we are working with pixels.
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, fWidth, fHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null
		);

		// Create a framebuffer
		const frameBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

		// Attach a texture to it.
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

		return {
			frameBuffer,
			texture
		};
	};

	return {
		gl,
		prepareShader,
		render,
		createShader,
		createVertexShader,
		createFragmentShader,
		createShaderProgram,
		createShaderProgramFromSource,
		setShaderUniform,
		createFrameBuffer
	};
};

window.makeShaderCanvas = makeShaderCanvas;
