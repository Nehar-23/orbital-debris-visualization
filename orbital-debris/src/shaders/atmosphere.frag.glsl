varying vec3 vNormal;
varying vec3 vViewDir;

uniform float uTime;

void main() {
  float rim = 1.0 - dot(normalize(vNormal), normalize(vViewDir));
  rim = pow(rim, 2.8);

  // Subtle shimmer
  float shimmer = 0.95 + 0.05 * sin(uTime * 0.25);
  rim *= shimmer;

  vec3 color = vec3(0.62, 0.40, 0.95); // violet atmosphere halo (#9e66f2)
  float alpha = rim * 0.50;

  gl_FragColor = vec4(color, alpha);
}
