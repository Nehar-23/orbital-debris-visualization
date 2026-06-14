varying float vClass;
varying float vDist;
varying float vAlpha;

void main() {
  // Soft circular point
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.2, d);

  vec3 color;
  if (vClass < 0.5)       color = vec3(0.44, 0.44, 0.44);        // debris #707070
  else if (vClass < 1.5)  color = vec3(1.0, 1.0, 1.0);           // active #FFFFFF
  else if (vClass < 2.5)  color = vec3(0.78, 0.78, 0.78);        // rocket body #C8C8C8
  else                    color = vec3(0.941, 0.957, 1.0);        // starlink #F0F4FF

  // Distance fade
  float distFade = clamp(1.0 - vDist / 80.0, 0.15, 1.0);
  alpha *= distFade * vAlpha;

  gl_FragColor = vec4(color, alpha);
}
