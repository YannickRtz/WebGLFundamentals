#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// our texture
uniform sampler2D u_image;

// mouse position
uniform vec2 u_mouse;

// Time in seconds
uniform float u_time;

// If readOnly is true, we just want to copy the texture (to the canvas)
uniform bool u_readOnly;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec4 texCol = texture(u_image, v_texCoord);
  if (!u_readOnly) {
    float mouseDist = distance(u_mouse, gl_FragCoord.xy);
    // On / Off
    float newAlpha = mix(1., texCol.a, max(0., min(1., mouseDist - 40.)));

    float newRed = fract(texCol.r + 0.02);
    newRed = mix(0., newRed, max(0., min(1., mouseDist - 40.)));
    float newGreen = sin((newRed - 0.25) * 6.28318530718) / 2. + 0.5;


    // Global phase
    //float phase = sin(u_time / 10.) / 2. + 0.5;
    // Local phase
    //float newRed = mix(phase, texCol.r, max(0., min(1., mouseDist - 40.)));
    // Global phase, shifted
    //float newGreen = sin(u_time / 10. - newRed * 3.141592653) / 2. + 0.5;
    outColor = vec4(newRed, newGreen, 1., newAlpha);
  } else {
    // float value = sin((texCol.r + texCol.g) * 3.14159) / 2. + 0.5;
    // outColor = vec4(vec3(value), texCol.a);
    outColor = vec4(vec3(texCol.g), texCol.a);
  }
}
