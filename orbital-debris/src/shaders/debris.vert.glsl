attribute float classification;
attribute float pointSize;
varying float vClass;
varying float vDist;
varying float vAlpha;

uniform float uTime;

void main() {
  vClass = classification;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vDist = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;

  // Size attenuation by distance
  float baseSize = pointSize;
  gl_PointSize = baseSize * (280.0 / max(vDist, 1.0));
  gl_PointSize = clamp(gl_PointSize, 0.8, 6.0);

  // Starlink pulse
  float pulse = 1.0;
  if (classification > 2.5) {
    float phase = position.x * 13.7 + position.y * 7.3; // per-object offset
    pulse = 0.85 + 0.15 * sin(uTime * 2.0 + phase);
  }
  vAlpha = pulse;
}
