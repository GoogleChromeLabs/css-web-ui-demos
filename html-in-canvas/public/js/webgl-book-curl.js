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
    vec3 pos = aPosition;
    
   // Intensity that climbs fast and stays high until the very end
    float flightPhase = smoothstep(0.0, 0.1, t);
    float landingPhase = smoothstep(1.0, 0.75, t);
    float curlIntensity = flightPhase * landingPhase;
    
    
    // HINGE PROTECTION: Lock the spine at x=0
    float spineWeight = smoothstep(0.0, 0.7, pos.x);
    
    // STEEP AXIS: diag = x - 0.6y focuses lift at exactly (uPageW, -1.5)
    // BR(2, -1.5) = 2.9, MR(2, 0) = 2.0, TR(2, 1.5) = 1.1
    float diag = pos.x - (pos.y * 0.6); 
    
    // Threshold sweeps across but dampened to stay 'low'
    float threshold = 2.9 - (curlIntensity * 2.0); 
    
    // Tight roll in the air (R=0.6)
    float R = 0.6 + (1.0 - curlIntensity) * 20.0;
    
    if (diag > threshold) {
        float d = diag - threshold;
        // Very shallow angle for STIFF feel (max 0.28 rad)
        // Deeper roll (2.5 radians) that only snaps to 0 at the very last moment
        float angle = min(d / R, 3.8 * curlIntensity);
        
        // Deformation: bend up strictly at the corner
        float bend = R * (1.0 - cos(angle)) * spineWeight;
        float curlDir = mix(1.0, -1.0, t); 
        pos.z += bend * curlDir;
        
        // Minimal pull-in to avoid ripples
        float pull = R * sin(angle) * 0.02 * spineWeight;
        pos.x -= pull; 
    }
    
    // Spine Sanity Check
    if (pos.x < 0.001) { pos.z = 0.0; }

    // 2. Main Spine Rotation
    float theta = t * 3.14159265;
    float xRot = pos.x * cos(theta) - pos.z * sin(theta);
    float zRot = pos.x * sin(theta) + pos.z * cos(theta);
    pos.x = xRot;
    pos.z = zRot;

    vec4 worldPos = uModel * vec4(pos, 1.0);
    gl_Position = uProjection * uView * worldPos;

    // Normals
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
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    float diff = max(dot(n, lightDir), 0.4); 
    vec3 color = texColor.rgb * diff;
    
    // Spine shadow gradient
    float distToSpine = gl_FrontFacing ? vTexCoord.x : (1.0 - vTexCoord.x);
    float gradShadow = smoothstep(0.0, 0.2, distToSpine);
    color *= mix(0.6, 1.0, gradShadow);

    fragColor = vec4(color, texColor.a);
}`;

export function setupCurlBookRendering(canvas, numTotalPages = 6) {
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

    const plane = createPlane(PAGE_WIDTH, PAGE_HEIGHT, 60, 60); 
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

    const pages = [];
    for (let i = 0; i < numTotalPages / 2; i++) {
        pages.push({
            frontId: `page-${i * 2}`,
            backId: `page-${i * 2 + 1}`,
            frontTex: createPageTexture(gl),
            backTex: createPageTexture(gl),
            progress: 0,
            targetProgress: 0
        });
    }

    // Drag-to-Flip Logic
    let isDragging = false;
    let dragPage = null;
    let dragStartProgress = 0;
    let dragStartX = 0;

    canvas.addEventListener('pointerdown', e => {
        const xPercent = e.clientX / window.innerWidth;
        
        if (xPercent > 0.5) {
            // Pick the top-most page on the right to flip next
            dragPage = pages.find(p => p.targetProgress === 0.0);
        } else {
            // Pick the top-most page on the left to flip back
            const flipped = [...pages].reverse();
            dragPage = flipped.find(p => p.targetProgress === 1.0);
        }

        if (dragPage) {
            isDragging = true;
            dragStartX = e.clientX;
            dragStartProgress = dragPage.progress;
            canvas.setPointerCapture(e.pointerId);
        }
    });

    canvas.addEventListener('pointermove', e => {
        if (!isDragging || !dragPage) return;
        
        const deltaX = dragStartX - e.clientX;
        const progressDelta = deltaX / (window.innerWidth * 0.7); // Adjust sensitivity
        
        let newProgress = dragStartProgress + progressDelta;
        dragPage.progress = Math.max(0.001, Math.min(0.999, newProgress));
        // We set targetProgress to current so it doesn't try to snap while dragging
        dragPage.targetProgress = dragPage.progress;
    });

    canvas.addEventListener('pointerup', e => {
        if (!isDragging || !dragPage) return;
        
        isDragging = false;
        // Snap back or finish flip based on halfway point
        dragPage.targetProgress = dragPage.progress > 0.5 ? 1.0 : 0.0;
        dragPage = null;
    });

    // Keyboard fallback
    window.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') {
            const p = pages.find(p => p.targetProgress === 0.0);
            if (p) { p.targetProgress = 1.0; p.progress = Math.max(0.01, p.progress); }
        }
        if (e.key === 'ArrowLeft') {
            const reversed = [...pages].reverse();
            const p = reversed.find(p => p.targetProgress === 1.0);
            if (p) { p.targetProgress = 0.0; p.progress = Math.min(0.99, p.progress); }
        }
    });

    let lastTime = 0;
    function render(time) {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        for (let p of pages) {
            // Only interpolate if not being manually dragged
            const activeDraggingThisPage = isDragging && dragPage === p;
            if (!activeDraggingThisPage && p.progress !== p.targetProgress) {
                const speed = 5;
                if (p.progress < p.targetProgress) p.progress = Math.min(p.targetProgress, p.progress + speed * dt);
                else p.progress = Math.max(p.targetProgress, p.progress - speed * dt);
            }
            updatePageTextureFromDOM(gl, p.frontTex, p.frontId);
            updatePageTextureFromDOM(gl, p.backTex, p.backId);
        }

        // Update UI button states
        const canNext = pages.some(p => p.targetProgress === 0.0);
        const canPrev = pages.some(p => p.targetProgress === 1.0);
        const nextBtn = document.getElementById('next-btn');
        const prevBtn = document.getElementById('prev-btn');
        if (nextBtn) nextBtn.disabled = !canNext;
        if (prevBtn) prevBtn.disabled = !canPrev;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.useProgram(program);

        const projection = mat4.create();
        mat4.perspective(projection, 45 * Math.PI / 180, canvas.width / canvas.height, 0.1, 100.0);
        const view = mat4.create();
        mat4.lookAt(view, [0, 1, 8], [0, 0, 0], [0, 1, 0]);

        gl.uniformMatrix4fv(uniforms.uProjection, false, projection);
        gl.uniformMatrix4fv(uniforms.uView, false, view);
        gl.uniform1f(uniforms.uPageWidth, PAGE_WIDTH);

        gl.bindVertexArray(vao);
        
        let topRightIndex = -1;
        for (let i = 0; i < pages.length; i++) {
            if (pages[i].progress <= 0.001) { topRightIndex = i; break; }
        }
        let topLeftIndex = -1;
        for (let i = pages.length - 1; i >= 0; i--) {
            if (pages[i].progress >= 0.999) { topLeftIndex = i; break; }
        }

        for (let i = 0; i < pages.length; i++) {
            const p = pages[i];
            const t = p.progress;
            
            const zRight = -i * 0.02;
            const zLeft = -(pages.length - 1 - i) * 0.02;
            const zOffset = (1.0 - t) * zRight + t * zLeft;

            const model = mat4.create();
            mat4.translate(model, model, [0, 0, zOffset]);
            mat4.rotateX(model, model, -0.1); 

            gl.uniformMatrix4fv(uniforms.uModel, false, model);
            gl.uniform1f(uniforms.uTurnProgress, t);

            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, p.frontTex);
            gl.uniform1i(uniforms.uFrontTex, 0);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, p.backTex);
            gl.uniform1i(uniforms.uBackTex, 1);

            gl.drawElements(gl.TRIANGLES, plane.indices.length, gl.UNSIGNED_SHORT, 0);

            // Sync HTML interaction
            if (canvas.getElementTransform) {
                const toGLModel = new DOMMatrix()
                    .scale(PAGE_WIDTH / 800, -PAGE_HEIGHT / 1200, 1)
                    .translate(0, -1200 / 2);

                const toCSSViewport = new DOMMatrix()
                    .translate(canvas.width / 2, canvas.height / 2)
                    .scale(canvas.width / 2, -canvas.height / 2, 1);

                const mapPage = (elId, isFront) => {
                    const el = document.getElementById(elId);
                    if (!el) return;
                    
                    const flatRot = mat4.create();
                    mat4.translate(flatRot, flatRot, [0, 0, zOffset]);
                    mat4.rotateX(flatRot, flatRot, -0.1);
                    mat4.rotateY(flatRot, flatRot, -t * Math.PI);
                    if (!isFront) {
                        mat4.translate(flatRot, flatRot, [PAGE_WIDTH, 0, 0]);
                        mat4.scale(flatRot, flatRot, [-1, 1, 1]);
                    }

                    const mvp = mat4.create();
                    mat4.multiply(mvp, projection, view);
                    mat4.multiply(mvp, mvp, flatRot);

                    const finalT = toCSSViewport.multiply(new DOMMatrix(Array.from(mvp))).multiply(toGLModel);
                    const syncT = canvas.getElementTransform(el, finalT);
                    if (syncT) el.style.transform = syncT.toString();
                    
                    const isFacing = isFront ? (t < 0.5) : (t > 0.5);
                    const isTurning = t > 0.001 && t < 0.999;
                    const isTopActive = (i === topRightIndex || i === topLeftIndex || isTurning);
                    
                    el.style.zIndex = Math.round((zOffset + 5) * 1000 + (isFacing ? 100 : -100));
                    el.style.pointerEvents = (isFacing && isTopActive) ? 'auto' : 'none';
                    el.style.visibility = 'visible';
                };
                mapPage(p.frontId, true);
                mapPage(p.backId, false);
            }
        }
        requestAnimationFrame(render);
    }
    
    let started = false;
    canvas.onpaint = () => { if(!started){ started=true; requestAnimationFrame(render); } };
    setTimeout(() => { if(!started){ started=true; requestAnimationFrame(render); } }, 100);
}
