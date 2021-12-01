import * as webglUtils from '@aaronjewell/webgl2-utils';

const image = new Image();
image.src = "./leaves.jpg";  // MUST BE SAME DOMAIN!!!
image.onload = function() {
    loadShaders();
};

function loadShaders() {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener("load", function(data) {
        const fragmentShaderSource: string = (data.target as any).response;
        const xhr = new XMLHttpRequest();
        xhr.addEventListener("load", function(data) {
            const vertexShaderSource: string = (data.target as any).response;
            render(vertexShaderSource, fragmentShaderSource);
        });
        xhr.open("GET","shader.vert");
        xhr.send();
    });
    xhr.open("GET","shader.frag");
    xhr.send();
}

function render(vertexShaderSource: string, fragmentShaderSource: string) {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    const canvas: HTMLCanvasElement = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false });
    if (!gl) {
        return;
    }

    let mouseX = 0;
    let mouseY = 0;
     
    function setMousePosition(e: MouseEvent) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = rect.height - (e.clientY - rect.top) - 1;  // bottom is 0 in W
        draw();
    }
     
    canvas.addEventListener('mousemove', setMousePosition);

    // setup GLSL program
    const program = webglUtils.createProgramFromSources(gl,
        [vertexShaderSource, fragmentShaderSource]);

    // look up where the vertex data needs to go.
    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");

    // lookup uniforms
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const imageLocation = gl.getUniformLocation(program, "u_image");
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");
    const mouseLocationPrev = gl.getUniformLocation(program, "u_mouse_prev");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const readOnlyLocation = gl.getUniformLocation(program, "u_readOnly");
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

    // Define several convolution kernels
    const kernel =  [
        1, 1, 1, 1, 1,
        1, 2, 2, 2, 1,
        1, 2, 3, 2, 1,
        1, 2, 2, 2, 1,
        1, 1, 1, 1, 1
    ];

    const kernelWeight = kernel.reduce((prev, cur) => prev + cur);

    console.log('computed kernelweight', kernelWeight);

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

    function createAndSetupTexture(gl) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Set up texture so we can render any size image and so we are
        // working with pixels.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        return texture;
    }

    webglUtils.resizeCanvasToDisplaySize(gl.canvas); // , window.devicePixelRatio);

    // create 2 textures and attach them to framebuffers.
    const textures = [];
    const framebuffers = [];
    for (let ii = 0; ii < 2; ++ii) {
        const texture = createAndSetupTexture(gl);
        textures.push(texture);

        // make the texture the same size as the image
        const mipLevel = 0;               // the largest mip
        const internalFormat = gl.RGBA;   // format we want in the texture
        const border = 0;                 // must be 0
        const srcFormat = gl.RGBA;        // format of data we are supplying
        const srcType = gl.UNSIGNED_BYTE  // type of data we are supplying
        const data = null;                // no data = create a blank texture
        gl.texImage2D(
            gl.TEXTURE_2D, mipLevel, internalFormat, gl.canvas.width, gl.canvas.height, border,
            srcFormat, srcType, data);

        // Create a framebuffer
        const fbo = gl.createFramebuffer();
        framebuffers.push(fbo);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

        // Attach a texture to it.
        const attachmentPoint = gl.COLOR_ATTACHMENT0;
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, texture, mipLevel);

        // Clear the texture
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Bind the position buffer so gl.bufferData that will be called
    // in setRectangle puts data in the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Set a rectangle the same size as the image.
    setRectangle(gl, 0, 0, gl.canvas.width, gl.canvas.height);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // Pass in the canvas resolution so we can convert from
    // pixels to clipspace in the shader
    gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);

    // set the kernel and it's weight
    gl.uniform1fv(kernelLocation, kernel);
    gl.uniform1f(kernelWeightLocation, kernelWeight);

    const primitiveType = gl.TRIANGLES;
    const rectOffset = 0;
    const count = 6;

    let frameCount = 0;

    // make this the framebuffer we are rendering to
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[frameCount % 2]);

    // start with the original image on unit 0
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, textures[frameCount % 2]);

    let mouseXPrev = 0;
    let mouseYPrev = 0;

    function draw() {
        frameCount++;

        gl.uniform2f(mouseLocation, mouseX, mouseY);
        gl.uniform2f(mouseLocationPrev, mouseXPrev, mouseYPrev);
        gl.uniform1f(timeLocation, frameCount);
        gl.uniform1i(readOnlyLocation, 0);

        mouseXPrev = mouseX;
        mouseYPrev = mouseY;

        // Tell the shader to get the texture from texture unit 0
        gl.uniform1i(imageLocation, 0);

        // make this the framebuffer we are rendering to
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[frameCount % 2]);

        // Draw the rectangle.
        gl.drawArrays(primitiveType, rectOffset, count);

        gl.uniform1i(readOnlyLocation, 1);

        // for the next draw, use the texture we just rendered to.
        gl.bindTexture(gl.TEXTURE_2D, textures[frameCount % 2]);
        
        // finally draw the result to the canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawArrays(primitiveType, rectOffset, count);
    }
    draw();
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

