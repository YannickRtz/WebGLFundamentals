#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

// our texture
uniform sampler2D u_image;

// mouse position
uniform vec2 u_mouse;

uniform vec2 u_mouse_prev;

// Time in seconds
uniform float u_time;

// If readOnly is true, we just want to copy the texture (to the canvas)
uniform bool u_readOnly;

// the convolution kernel data for our "readOnly" step
uniform float u_kernel[25];
uniform float u_kernelWeight;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

// from https://stackoverflow.com/questions/63491296
float distanceFromPointToLine(in vec2 a, in vec2 b, in vec2 c) {
  vec2 ba = a - b;
  vec2 bc = c - b;
  float d = dot(ba, bc);
  float len = length(bc);
  float param = 0.0;
  if (len != 0.0) {
    param = clamp(d / (len * len), 0.0, 1.0);
  }
  vec2 r = b + bc * param;
  return distance(a, r);
}

// from https://github.com/hughsk/glsl-hsv2rgb
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec4 texCol = texture(u_image, v_texCoord);
  
  if (!u_readOnly) {

    float newAlpha;
    float newRed;

    float mouseDist = distanceFromPointToLine(gl_FragCoord.xy, u_mouse, u_mouse_prev);
    if (mouseDist < 40.) {
      newAlpha = 1.;
      newRed = 0.;
    } else {
      newAlpha = texCol.a;
      newRed = fract(texCol.r + 0.004);
    }

    float newGreen = sin((newRed - 0.25) * 6.28318530718) / 2. + 0.5;
    outColor = vec4(newRed, newGreen, 1., newAlpha);

  } else {
    vec2 onePixel = vec2(1) / vec2(textureSize(u_image, 0));

    vec4 theOne = texture(u_image, v_texCoord);

    vec4 colSum =
      texture(u_image, v_texCoord + onePixel * vec2(-2, -2)) * u_kernel[0] +
      texture(u_image, v_texCoord + onePixel * vec2(-1, -2)) * u_kernel[1] +
      texture(u_image, v_texCoord + onePixel * vec2( 0, -2)) * u_kernel[2] +
      texture(u_image, v_texCoord + onePixel * vec2( 1, -2)) * u_kernel[3] +
      texture(u_image, v_texCoord + onePixel * vec2( 2, -2)) * u_kernel[4] +
      texture(u_image, v_texCoord + onePixel * vec2(-2, -1)) * u_kernel[5] +
      texture(u_image, v_texCoord + onePixel * vec2(-1, -1)) * u_kernel[6] +
      texture(u_image, v_texCoord + onePixel * vec2( 0, -1)) * u_kernel[7] +
      texture(u_image, v_texCoord + onePixel * vec2( 1, -1)) * u_kernel[8] +
      texture(u_image, v_texCoord + onePixel * vec2( 2, -1)) * u_kernel[9] +
      texture(u_image, v_texCoord + onePixel * vec2(-2,  0)) * u_kernel[10] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  0)) * u_kernel[11] +
                                                      theOne * u_kernel[12] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  0)) * u_kernel[13] +
      texture(u_image, v_texCoord + onePixel * vec2( 2,  0)) * u_kernel[14] +
      texture(u_image, v_texCoord + onePixel * vec2(-2,  1)) * u_kernel[15] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  1)) * u_kernel[16] +
      texture(u_image, v_texCoord + onePixel * vec2( 0,  1)) * u_kernel[17] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  1)) * u_kernel[18] +
      texture(u_image, v_texCoord + onePixel * vec2( 2,  1)) * u_kernel[19] +
      texture(u_image, v_texCoord + onePixel * vec2(-2,  2)) * u_kernel[20] +
      texture(u_image, v_texCoord + onePixel * vec2(-1,  2)) * u_kernel[21] +
      texture(u_image, v_texCoord + onePixel * vec2( 0,  2)) * u_kernel[22] +
      texture(u_image, v_texCoord + onePixel * vec2( 1,  2)) * u_kernel[23] +
      texture(u_image, v_texCoord + onePixel * vec2( 2,  2)) * u_kernel[24] ;

      float hue = colSum.g / u_kernelWeight;
      vec3 targetCol = hsv2rgb(vec3(hue, 0.8, 1));

    outColor = vec4(targetCol, colSum.a / u_kernelWeight);
  }
}