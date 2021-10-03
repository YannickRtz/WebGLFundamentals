"use strict";

const vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec2 a_position;
in vec2 a_texCoord;

// Used to pass in the resolution of the canvas
uniform vec2 u_resolution;

// Used to pass the texture coordinates to the fragment shader
out vec2 v_texCoord;

// all shaders have a main function
void main() {

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = a_position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  // pass the texCoord to the fragment shader
  // The GPU will interpolate this value between points.
  v_texCoord = a_texCoord;
}
`;

const fragmentShaderSource = `#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// our texture
uniform sampler2D u_image;

// the convolution kernal data
uniform float u_kernel[9];
uniform float u_kernelWeight;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec2 onePixel = vec2(1) / vec2(textureSize(u_image, 0));

  vec4 colorSum =
      texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[0] +
      texture(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[1] +
      texture(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[2] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[3] +
      texture(u_image, v_texCoord + onePixel * vec2( 0,  0)) * u_kernel[4] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[5] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[6] +
      texture(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[7] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[8] ;
  outColor = vec4((colorSum / u_kernelWeight).rgb, 1);
}
`;

const image = new Image();
image.src = "./leaves.jpg";  // MUST BE SAME DOMAIN!!!
image.onload = function() {
    render(image);
};

function render(image) {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) {
        return;
    }

    // setup GLSL program
    const program = webglUtils.createProgramFromSources(gl,
        [vertexShaderSource, fragmentShaderSource]);

    // look up where the vertex data needs to go.
    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");

    // lookup uniforms
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const imageLocation = gl.getUniformLocation(program, "u_image");
    const kernelLocation = gl.getUniformLocation(program, "u_kernel[0]");
    const kernelWeightLocation = gl.getUniformLocation(program, "u_kernelWeight");

    // Create a vertex array object (attribute state)
    const vao = gl.createVertexArray();

    // and make it the one we're currently working with
    gl.bindVertexArray(vao);

    // Create a buffer and put a single pixel space rectangle in
    // it (2 triangles)
    const positionBuffer = gl.createBuffer();

    // Turn on the attribute
    gl.enableVertexAttribArray(positionAttributeLocation);

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    let size = 2;          // 2 components per iteration
    let type = gl.FLOAT;   // the data is 32bit floats
    let normalize = false; // don't normalize the data
    let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    let offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        positionAttributeLocation, size, type, normalize, stride, offset);

    // provide texture coordinates for the rectangle.
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0,  0.0,
        1.0,  0.0,
        0.0,  1.0,
        0.0,  1.0,
        1.0,  0.0,
        1.0,  1.0,
    ]), gl.STATIC_DRAW);

    // Turn on the attribute
    gl.enableVertexAttribArray(texCoordAttributeLocation);

    // Tell the attribute how to get data out of texCoordBuffer (ARRAY_BUFFER)
    size = 2;          // 2 components per iteration
    type = gl.FLOAT;   // the data is 32bit floats
    normalize = false; // don't normalize the data
    stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    offset = 0;        // start at the beginning of the buffer
    gl.vertexAttribPointer(
        texCoordAttributeLocation, size, type, normalize, stride, offset);

    // Create a texture.
    const texture = gl.createTexture();

    // make unit 0 the active texture uint
    // (ie, the unit all other texture commands will affect
    gl.activeTexture(gl.TEXTURE0 + 0);

    // Bind it to texture unit 0's 2D bind point
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we don't need mips and so we're not filtering
    // and we don't repeat at the edges.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Upload the image into the texture.
    const mipLevel = 0;               // the largest mip
    const internalFormat = gl.RGBA;   // format we want in the texture
    const srcFormat = gl.RGBA;        // format of data we are supplying
    const srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
    gl.texImage2D(gl.TEXTURE_2D,
        mipLevel,
        internalFormat,
        srcFormat,
        srcType,
        image);

    // Bind the position buffer so gl.bufferData that will be called
    // in setRectangle puts data in the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Set a rectangle the same size as the image.
    setRectangle(gl, 0, 0, image.width, image.height);

    // Define several convolution kernels
    const kernels = {
        normal: [
            0, 0, 0,
            0, 1, 0,
            0, 0, 0,
        ],
        gaussianBlur: [
            0.045, 0.122, 0.045,
            0.122, 0.332, 0.122,
            0.045, 0.122, 0.045,
        ],
        gaussianBlur2: [
            1, 2, 1,
            2, 4, 2,
            1, 2, 1,
        ],
        gaussianBlur3: [
            0, 1, 0,
            1, 1, 1,
            0, 1, 0,
        ],
        unsharpen: [
            -1, -1, -1,
            -1, 9, -1,
            -1, -1, -1,
        ],
        sharpness: [
            0, -1, 0,
            -1, 5, -1,
            0, -1, 0,
        ],
        sharpen: [
            -1, -1, -1,
            -1, 16, -1,
            -1, -1, -1,
        ],
        edgeDetect: [
            -0.125, -0.125, -0.125,
            -0.125, 1, -0.125,
            -0.125, -0.125, -0.125,
        ],
        edgeDetect2: [
            -1, -1, -1,
            -1, 8, -1,
            -1, -1, -1,
        ],
        edgeDetect3: [
            -5, 0, 0,
            0, 0, 0,
            0, 0, 5,
        ],
        edgeDetect4: [
            -1, -1, -1,
            0, 0, 0,
            1, 1, 1,
        ],
        edgeDetect5: [
            -1, -1, -1,
            2, 2, 2,
            -1, -1, -1,
        ],
        edgeDetect6: [
            -5, -5, -5,
            -5, 39, -5,
            -5, -5, -5,
        ],
        sobelHorizontal: [
            1, 2, 1,
            0, 0, 0,
            -1, -2, -1,
        ],
        sobelVertical: [
            1, 0, -1,
            2, 0, -2,
            1, 0, -1,
        ],
        previtHorizontal: [
            1, 1, 1,
            0, 0, 0,
            -1, -1, -1,
        ],
        previtVertical: [
            1, 0, -1,
            1, 0, -1,
            1, 0, -1,
        ],
        boxBlur: [
            0.111, 0.111, 0.111,
            0.111, 0.111, 0.111,
            0.111, 0.111, 0.111,
        ],
        triangleBlur: [
            0.0625, 0.125, 0.0625,
            0.125, 0.25, 0.125,
            0.0625, 0.125, 0.0625,
        ],
        emboss: [
            -2, -1, 0,
            -1, 1, 1,
            0, 1, 2,
        ],
    };
    const initialSelection = 'edgeDetect2';

    // Setup UI to pick kernels.
    const ui = document.querySelector("#ui");
    const select = document.createElement("select");
    for (const name in kernels) {
        const option = document.createElement("option");
        option.value = name;
        if (name === initialSelection) {
            option.selected = true;
        }
        option.appendChild(document.createTextNode(name));
        select.appendChild(option);
    }
    select.onchange = function() {
        drawWithKernel(this.options[this.selectedIndex].value);
    };
    ui.appendChild(select);

    drawWithKernel(initialSelection);

    function computeKernelWeight(kernel) {
        const weight = kernel.reduce(function (prev, curr) {
            return prev + curr;
        });
        return weight <= 0 ? 1 : weight;
    }

    function drawWithKernel(name) {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Clear the canvas
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);

        // Bind the attribute/buffer set we want.
        gl.bindVertexArray(vao);

        // Pass in the canvas resolution so we can convert from
        // pixels to clipspace in the shader
        gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

        // Tell the shader to get the texture from texture unit 0
        gl.uniform1i(imageLocation, 0);

        // set the kernel and it's weight
        gl.uniform1fv(kernelLocation, kernels[name]);
        gl.uniform1f(kernelWeightLocation, computeKernelWeight(kernels[name]));

        // Draw the rectangle.
        const primitiveType = gl.TRIANGLES;
        const offset = 0;
        const count = 6;
        gl.drawArrays(primitiveType, offset, count);
    }
}

function setRectangle(gl, x, y, width, height) {
    const x1 = x;
    const x2 = x + width;
    const y1 = y;
    const y2 = y + height;
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1, y1,
        x2, y1,
        x1, y2,
        x1, y2,
        x2, y1,
        x2, y2,
    ]), gl.STATIC_DRAW);
}

