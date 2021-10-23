#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// our texture
uniform sampler2D u_image;

// mouse position
uniform vec2 u_mouse;

// Used to pass in the resolution of the canvas
uniform vec2 u_resolution;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec4 texCol = texture(u_image, v_texCoord);
  float mouseDist = distance(u_mouse, gl_FragCoord.xy);
  float newAlpha = mix(1., texCol.a, max(0., min(1., mouseDist - 40.)));
  outColor = vec4(vec3(1.), newAlpha);
}
