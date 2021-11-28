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

// the convolution kernel data for our "readOnly" step
uniform float u_kernel[25];
uniform float u_kernelWeight;

// the texCoords passed in from the vertex shader.
in vec2 v_texCoord;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec4 texCol = texture(u_image, v_texCoord);
  
  if (!u_readOnly) {

    float newAlpha;
    float newRed;

    float mouseDist = distance(u_mouse, gl_FragCoord.xy);
    if (mouseDist < 40.) {
      newAlpha = 1.;
      newRed = 0.;
    } else {
      newAlpha = texCol.a;
      newRed = fract(texCol.r + 0.02);
    }

    float newGreen = sin((newRed - 0.25) * 6.28318530718) / 2. + 0.5;
    outColor = vec4(newRed, newGreen, 1., newAlpha);

  } else {
    vec2 onePixel = vec2(1) / vec2(textureSize(u_image, 0));

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
      texture(u_image, v_texCoord + onePixel * vec2( 0,  0)) * u_kernel[12] +
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

    outColor = vec4(vec3(colSum.g / u_kernelWeight), colSum.a / u_kernelWeight);
  }
}
