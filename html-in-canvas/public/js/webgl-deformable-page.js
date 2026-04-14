/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const PAGE_WIDTH = 5.0;
const PAGE_HEIGHT = 7.0;

function createPlane(width, height, segX, segY) {
    const positions = [], normals = [], uvs = [], indices = [];
    for (let y = 0; y <= segY; y++) {
        for (let x = 0; x <= segX; x++) {
            const u = x / segX;
            const v = y / segY;
            positions.push((u - 0.5) * width, (v - 0.5) * height, 0);
            normals.push(0, 0, 1);
            uvs.push(u, 1.0 - v);
        }
    }
    for (let y = 0; y < segY; y++) {
        for (let x = 0; x < segX; x++) {
            const p1 = y * (segX + 1) + x;
            const p2 = p1 + 1;
            const p3 = (y + 1) * (segX + 1) + x;
            const p4 = p3 + 1;
            indices.push(p1, p2, p3);
            indices.push(p2, p4, p3);
        }
    }
    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        uvs: new Float32Array(uvs),
        indices: new Uint16Array(indices)
    };
}

const vsSource = `#version 300 es
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTexCoord;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

uniform int uMode;
uniform float uIntensity;
uniform float uTime;
uniform float uFreq;

out vec2 vTexCoord;
out vec3 vNormal;

void main() {
    vec3 pos = aPosition;
    
    // Offset for better localized effects
    float xOff = pos.x + 2.5; 
    
    if (uMode == 0) { // WAVE (Flag)
        pos.z = sin(xOff * uFreq * 2.0 + uTime * 3.0) * 0.5 * uIntensity;
        // Dampen at the "spine" (left side)
        pos.z *= smoothstep(0.0, 1.0, xOff);
    } else if (uMode == 1) { // CURL (Diagonal)
        float diag = xOff - (pos.y * 0.6);
        // Subtle threshold breathing
        float breathing = sin(uTime * 1.5) * 0.1 * uIntensity;
        float threshold = 5.0 - (uIntensity * 4.0) + breathing;
        if (diag > threshold) {
            float d = diag - threshold;
            float angle = d * 1.5 * uIntensity;
            pos.z += (1.0 - cos(angle)) * 0.8;
            pos.x -= sin(angle) * 0.2;
        }
    } else if (uMode == 2) { // ROLL (Cylindrical)
        // Subtle roll pulsing
        float pulse = 1.0 + sin(uTime * 2.0) * 0.05 * uIntensity;
        float angle = xOff * uIntensity * 1.5 * pulse;
        pos.z += (1.0 - cos(angle)) * 1.2;
        pos.x -= sin(angle) * 0.5;
    } else if (uMode == 3) { // BULGE (Sphere)
        float dist = distance(pos.xy, vec2(0.0, 0.0));
        float breathing = 1.0 + sin(uTime * 2.0) * 0.1;
        pos.z += exp(-dist * dist * 0.4) * 3.0 * uIntensity * breathing;
    } else if (uMode == 4) { // TWIST (Whirlpool)
        float dist = length(pos.xy);
        float angle = dist * uIntensity * 2.5 + (sin(uTime) * 0.1);
        float s = sin(angle), c = cos(angle);
        float nx = pos.x * c - pos.y * s;
        float ny = pos.x * s + pos.y * c;
        pos.x = nx; pos.y = ny;
        pos.z += sin(dist * uIntensity * 5.0 + uTime) * 0.2 * uIntensity;
    } else if (uMode == 5) { // FOLD (Crease)
        float foldPos = sin(uTime * 0.5) * 0.2; // Subtle swaying fold
        pos.z = abs(pos.x - foldPos) * uIntensity * 2.0;
        // Sharpen the crease
        pos.z *= smoothstep(0.0, 0.5, abs(pos.x - foldPos));
    }

    vTexCoord = aTexCoord;
    vNormal = mat3(uModel) * aNormal; // Simplified normal for this example
    gl_Position = uProjection * uView * uModel * vec4(pos, 1.0);
}
`;

const fsSource = `#version 300 es
precision highp float;
in vec2 vTexCoord;
in vec3 vNormal;
uniform sampler2D uTex;
out vec4 fragColor;
void main() {
    vec4 texColor = texture(uTex, vTexCoord);
    vec3 n = normalize(vNormal);
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    float diff = max(dot(n, lightDir), 0.6);
    fragColor = vec4(texColor.rgb * diff, texColor.a);
}
`;

export function setupDeformableRendering(canvas, domId) {
    const gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) return;

    // State
    let mode = 0;
    let intensity = 0.8;
    let speed = 0.8;
    let time = 0;

    const program = gl.createProgram();
    const createShader = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
        return s;
    };
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);

    const plane = createPlane(PAGE_WIDTH, PAGE_HEIGHT, 80, 80);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const bufs = [gl.createBuffer(), gl.createBuffer(), gl.createBuffer(), gl.createBuffer()];
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs[0]); gl.bufferData(gl.ARRAY_BUFFER, plane.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs[1]); gl.bufferData(gl.ARRAY_BUFFER, plane.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufs[2]); gl.bufferData(gl.ARRAY_BUFFER, plane.uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufs[3]); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plane.indices, gl.STATIC_DRAW);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const uniforms = {
        uProj: gl.getUniformLocation(program, 'uProjection'),
        uView: gl.getUniformLocation(program, 'uView'),
        uModel: gl.getUniformLocation(program, 'uModel'),
        uMode: gl.getUniformLocation(program, 'uMode'),
        uIntensity: gl.getUniformLocation(program, 'uIntensity'),
        uTime: gl.getUniformLocation(program, 'uTime'),
        uFreq: gl.getUniformLocation(program, 'uFreq'),
    };

    function update() {
        if (!gl.texElementImage2D) return;
        const el = document.getElementById(domId);
        if (!el) return;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, el);
    }

    const projection = mat4.create();
    const view = mat4.create();
    mat4.lookAt(view, [0, 0, 10], [0, 0, 0], [0, 1, 0]);

    let lastTime = 0;
    function render(t) {
        const dt = (t - lastTime) / 1000;
        lastTime = t;
        time += dt * speed;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);

        gl.useProgram(program);
        mat4.perspective(projection, 45 * Math.PI / 180, canvas.width / canvas.height, 0.1, 100);
        
        gl.uniformMatrix4fv(uniforms.uProj, false, projection);
        gl.uniformMatrix4fv(uniforms.uView, false, view);
        gl.uniform1i(uniforms.uMode, mode);
        gl.uniform1f(uniforms.uIntensity, intensity);
        gl.uniform1f(uniforms.uTime, time);
        gl.uniform1f(uniforms.uFreq, speed);

        const model = mat4.create();
        mat4.rotateY(model, model, -0.2); // Slight tilt
        gl.uniformMatrix4fv(uniforms.uModel, false, model);

        update();
        gl.bindVertexArray(vao);
        gl.drawElements(gl.TRIANGLES, plane.indices.length, gl.UNSIGNED_SHORT, 0);

        // SYNC INTERACTIVITY
        if (canvas.getElementTransform) {
            const el = document.getElementById(domId);
            const toGLModel = new DOMMatrix().scale(PAGE_WIDTH / 800, -PAGE_HEIGHT / 1100, 1).translate(-400, -550);
            const toCSSViewport = new DOMMatrix().translate(canvas.width / 2, canvas.height / 2).scale(canvas.width / 2, -canvas.height / 2, 1);
            
            const mvp = mat4.create();
            mat4.mul(mvp, projection, view);
            mat4.mul(mvp, mvp, model);
            
            const finalT = toCSSViewport.multiply(new DOMMatrix(Array.from(mvp))).multiply(toGLModel);
            const syncT = canvas.getElementTransform(el, finalT);
            if (syncT) el.style.transform = syncT.toString();
        }

        requestAnimationFrame(render);
    }

    canvas.onpaint = () => {
        gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(render);

    return {
        setMode: (m) => mode = m,
        setIntensity: (v) => intensity = v,
        setSpeed: (v) => speed = v
    };
}
