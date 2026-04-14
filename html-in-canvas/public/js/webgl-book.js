/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const PAGE_WIDTH = 2.0;
const PAGE_HEIGHT = 3.0;

export function createPlane(width, height, segX, segY) {
    const positions = [], normals = [], uvs = [], indices = [];
    for (let y = 0; y <= segY; y++) {
        for (let x = 0; x <= segX; x++) {
            const u = x / segX;
            const v = y / segY;
            positions.push(u * width, (v - 0.5) * height, 0);
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

export function createPageTexture(gl) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
}

export function updatePageTextureFromDOM(gl, tex, domId) {
    if (!gl.texElementImage2D) return;
    const element = document.getElementById(domId);
    if (!element) return;

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
}

export function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

export const vsSource = `#version 300 es
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTexCoord;

uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;

uniform float uTurnProgress;
uniform float uPageWidth;

out vec2 vTexCoord;
out vec3 vNormal;
out vec3 vWorldPos;

void main() {
    float t = uTurnProgress;
    float theta = t * 3.14159265;
    vec3 pos = aPosition;

    float normalizedDist = pos.x / uPageWidth;
    
    // Pages bow backwards when peeled (air resistance/tension)
    float sagAmount = -sin(theta) * uPageWidth * 0.15;
    float sagProfile = pow(normalizedDist, 1.5); 
    pos.z += sagAmount * sagProfile;

    // Rotate around spine
    float xRot = pos.x * cos(theta) - pos.z * sin(theta);
    float zRot = pos.x * sin(theta) + pos.z * cos(theta);
    pos.x = xRot;
    pos.z = zRot;

    vec4 worldPos = uModel * vec4(pos, 1.0);
    gl_Position = uProjection * uView * worldPos;

    // Approximate normals for lighting
    vec3 n = aNormal;
    float nx = n.x * cos(theta) - n.z * sin(theta);
    float nz = n.x * sin(theta) + n.z * cos(theta);
    vNormal = mat3(uModel) * vec3(nx, n.y, nz);
    
    vWorldPos = worldPos.xyz;
    vTexCoord = aTexCoord;
}`;

export const fsSource = `#version 300 es
precision highp float;

in vec2 vTexCoord;
in vec3 vNormal;
in vec3 vWorldPos;

uniform sampler2D uFrontTex;
uniform sampler2D uBackTex;

out vec4 fragColor;

void main() {
    vec2 texCoord = vTexCoord;
    vec4 texColor;
    vec3 n = normalize(vNormal);

    if (gl_FrontFacing) {
        texColor = texture(uFrontTex, texCoord);
    } else {
        texCoord.x = 1.0 - texCoord.x;
        texColor = texture(uBackTex, texCoord);
        n = -n;
    }

    vec3 lightDir = normalize(vec3(0.4, 0.8, 0.8)); // angled lit
    float diff = max(dot(n, lightDir), 0.3); 
    vec3 color = texColor.rgb * diff;
    
    // Spine shadow gradient
    float distToSpine = gl_FrontFacing ? vTexCoord.x : (1.0 - vTexCoord.x);
    float shadow = mix(0.4, 1.0, smoothstep(0.0, 0.2, distToSpine));
    color *= shadow;

    fragColor = vec4(color, texColor.a);
}`;

export function setupBookRendering(canvas, numTotalPages = 6) {
    const gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) { alert('WebGL2 not supported'); throw new Error('WebGL2 not supported'); }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });
    window.dispatchEvent(new Event('resize'));

    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);

    const uniforms = {
        uProjection: gl.getUniformLocation(program, 'uProjection'),
        uView: gl.getUniformLocation(program, 'uView'),
        uModel: gl.getUniformLocation(program, 'uModel'),
        uTurnProgress: gl.getUniformLocation(program, 'uTurnProgress'),
        uPageWidth: gl.getUniformLocation(program, 'uPageWidth'),
        uFrontTex: gl.getUniformLocation(program, 'uFrontTex'),
        uBackTex: gl.getUniformLocation(program, 'uBackTex')
    };

    const plane = createPlane(PAGE_WIDTH, PAGE_HEIGHT, 50, 50);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plane.positions, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const normBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plane.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    const uvBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, plane.uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

    const idxBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, plane.indices, gl.STATIC_DRAW);

    const pages = [];
    for (let i = 0; i < numTotalPages / 2; i++) {
        const frontId = `page-${i * 2}`;
        const backId = `page-${i * 2 + 1}`;
        const frontTex = createPageTexture(gl);
        const backTex = createPageTexture(gl);

        pages.push({
            frontId,
            backId,
            frontTex,
            backTex,
            progress: 0,
            targetProgress: 0
        });
    }

    function getTurnablePage(direction) {
        if (direction > 0) {
            return pages.find(p => p.targetProgress === 0.0) || null;
        } else {
            const reversed = [...pages].reverse();
            return reversed.find(p => p.targetProgress === 1.0) || null;
        }
    }

    window.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') {
            let p = getTurnablePage(1);
            if (p) { p.targetProgress = 1.0; p.progress = Math.max(0.01, p.progress); }
        }
        if (e.key === 'ArrowLeft') {
            let p = getTurnablePage(-1);
            if (p) { p.targetProgress = 0.0; p.progress = Math.min(0.99, p.progress); }
        }
    });

    let lastTime = 0;

    function render(time) {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        for (let p of pages) {
            if (p.targetProgress !== -1 && p.progress !== p.targetProgress) {
                const speed = 1.0;
                if (p.progress < p.targetProgress) {
                    p.progress = Math.min(p.targetProgress, p.progress + speed * dt);
                } else {
                    p.progress = Math.max(p.targetProgress, p.progress - speed * dt);
                }
            }
            updatePageTextureFromDOM(gl, p.frontTex, p.frontId);
            updatePageTextureFromDOM(gl, p.backTex, p.backId);
        }

        let topRightIndex = -1;
        for (let i = 0; i < pages.length; i++) {
            if (pages[i].progress <= 0.001) { topRightIndex = i; break; }
        }
        let topLeftIndex = -1;
        for (let i = pages.length - 1; i >= 0; i--) {
            if (pages[i].progress >= 0.999) { topLeftIndex = i; break; }
        }

        gl.clearColor(0.1, 0.1, 0.1, 0.0); // transparent background
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);

        gl.useProgram(program);

        const projection = mat4.create();
        mat4.perspective(projection, 45 * Math.PI / 180, canvas.width / canvas.height, 0.1, 100.0);

        const view = mat4.create();
        mat4.lookAt(view, [0, 0, 7], [0, 0, 0], [0, 1, 0]);

        gl.uniformMatrix4fv(uniforms.uProjection, false, projection);
        gl.uniformMatrix4fv(uniforms.uView, false, view);
        gl.uniform1f(uniforms.uPageWidth, PAGE_WIDTH);

        gl.bindVertexArray(vao);
        gl.activeTexture(gl.TEXTURE0);

        for (let i = 0; i < pages.length; i++) {
            const p = pages[i];
            const t = p.progress;
            const zRight = -i * 0.01;
            const zLeft = -(pages.length - 1 - i) * 0.01;
            const zOffset = (1.0 - t) * zRight + t * zLeft;

            const model = mat4.create();
            mat4.translate(model, model, [0, 0, zOffset]);
            mat4.rotateX(model, model, -0.15);

            gl.uniformMatrix4fv(uniforms.uModel, false, model);
            gl.uniform1f(uniforms.uTurnProgress, t);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, p.frontTex);
            gl.uniform1i(uniforms.uFrontTex, 0);

            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, p.backTex);
            gl.uniform1i(uniforms.uBackTex, 1);

            gl.drawElements(gl.TRIANGLES, plane.indices.length, gl.UNSIGNED_SHORT, 0);

            if (canvas.getElementTransform) {
                const toGLModel = new DOMMatrix()
                    .scale(PAGE_WIDTH / 800, -PAGE_HEIGHT / 1200, 1)
                    .translate(0, -1200 / 2);

                const flatModelFront = mat4.create();
                mat4.translate(flatModelFront, flatModelFront, [0, 0, zOffset]);
                mat4.rotateX(flatModelFront, flatModelFront, -0.15);
                mat4.rotateY(flatModelFront, flatModelFront, -t * Math.PI);

                const flatModelBack = mat4.create();
                mat4.translate(flatModelBack, flatModelBack, [0, 0, zOffset]);
                mat4.rotateX(flatModelBack, flatModelBack, -0.15);
                mat4.rotateY(flatModelBack, flatModelBack, -t * Math.PI);
                mat4.translate(flatModelBack, flatModelBack, [2.0, 0, 0]);
                mat4.scale(flatModelBack, flatModelBack, [-1, 1, 1]);

                const toCSSViewport = new DOMMatrix()
                    .translate(canvas.width / 2, canvas.height / 2)
                    .scale(canvas.width / 2, -canvas.height / 2, 1);

                const mvpFront = mat4.create();
                mat4.multiply(mvpFront, projection, view);
                mat4.multiply(mvpFront, mvpFront, flatModelFront);

                const isFrontVisible = t < 0.5;
                const turnBoost = Math.sin(t * Math.PI) * 1000;
                const zBase = (zOffset + 1.0) * 10000 + turnBoost;
                
                const isTurning = t > 0.001 && t < 0.999;
                const isTopActive = (i === topRightIndex || i === topLeftIndex || isTurning);

                const frontEl = document.getElementById(p.frontId);
                if (frontEl) {
                    const finalTransformFront = toCSSViewport.multiply(new DOMMatrix(Array.from(mvpFront))).multiply(toGLModel);
                    const tFront = canvas.getElementTransform(frontEl, finalTransformFront);
                    if (tFront) frontEl.style.transform = tFront.toString();
                    frontEl.style.zIndex = Math.round(zBase + (isFrontVisible ? 10 : -10));
                    frontEl.style.pointerEvents = (isFrontVisible && isTopActive) ? 'auto' : 'none';
                }

                const mvpBack = mat4.create();
                mat4.multiply(mvpBack, projection, view);
                mat4.multiply(mvpBack, mvpBack, flatModelBack);

                const backEl = document.getElementById(p.backId);
                if (backEl) {
                    const finalTransformBack = toCSSViewport.multiply(new DOMMatrix(Array.from(mvpBack))).multiply(toGLModel);
                    const tBack = canvas.getElementTransform(backEl, finalTransformBack);
                    if (tBack) backEl.style.transform = tBack.toString();
                    backEl.style.zIndex = Math.round(zBase + (!isFrontVisible ? 10 : -10));
                    backEl.style.pointerEvents = (!isFrontVisible && isTopActive) ? 'auto' : 'none';
                }
            }
        }
        requestAnimationFrame(render);
    }
    
    let renderLoopStarted = false;
    
    function startLoop() {
        if (!renderLoopStarted) {
            renderLoopStarted = true;
            requestAnimationFrame(render);
        }
    }

    canvas.onpaint = startLoop;
    
    // Kick off immediately in case onpaint doesn't fire until interaction
    startLoop();
}
