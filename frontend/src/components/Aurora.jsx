import React, { useEffect, useRef } from 'react';

const Aurora = ({ colorStops = ['#ffd666', '#fa9200', '#895206'], amplitude = 1, blend = 1, speed = 1 }) => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      // Fallback: CSS-only aurora
      return;
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const vsSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return [r, g, b];
    };

    const colors = colorStops.map(hexToRgb);
    while (colors.length < 3) colors.push([0, 0, 0]);

    const fsSource = `
      precision mediump float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_amplitude;
      uniform float u_blend;
      uniform vec3 u_color0;
      uniform vec3 u_color1;
      uniform vec3 u_color2;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float t = u_time * 0.3;

        float n1 = noise(vec2(uv.x * 2.0 + t * 0.5, uv.y * 1.5 + t * 0.3)) * u_amplitude;
        float n2 = noise(vec2(uv.x * 1.5 - t * 0.4, uv.y * 2.0 + t * 0.2)) * u_amplitude;
        float n3 = noise(vec2(uv.x * 3.0 + t * 0.2, uv.y * 1.0 - t * 0.5)) * u_amplitude;

        float band1 = smoothstep(0.0, 0.6, uv.y + n1 * 0.3 - 0.2);
        float band2 = smoothstep(0.1, 0.7, uv.y + n2 * 0.3 - 0.4);
        float band3 = smoothstep(0.2, 0.9, uv.y + n3 * 0.3 - 0.6);

        vec3 col = mix(u_color0, u_color1, clamp(band1 * 1.5, 0.0, 1.0));
        col = mix(col, u_color2, clamp(band2, 0.0, 1.0));
        col += u_color0 * (1.0 - band3) * 0.3;

        col = mix(col, col * col, u_blend * 0.5);

        float darkness = 1.0 - uv.y * 0.7;
        col *= darkness * 0.9;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uRes = gl.getUniformLocation(program, 'u_resolution');
    const uAmp = gl.getUniformLocation(program, 'u_amplitude');
    const uBlend = gl.getUniformLocation(program, 'u_blend');
    const uC0 = gl.getUniformLocation(program, 'u_color0');
    const uC1 = gl.getUniformLocation(program, 'u_color1');
    const uC2 = gl.getUniformLocation(program, 'u_color2');

    gl.uniform1f(uAmp, amplitude);
    gl.uniform1f(uBlend, blend);
    gl.uniform3fv(uC0, colors[0]);
    gl.uniform3fv(uC1, colors[1]);
    gl.uniform3fv(uC2, colors[2]);

    const render = (ts) => {
      timeRef.current = ts / 1000;
      gl.uniform1f(uTime, timeRef.current * speed);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [colorStops, amplitude, blend, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
    />
  );
};

export default Aurora;
