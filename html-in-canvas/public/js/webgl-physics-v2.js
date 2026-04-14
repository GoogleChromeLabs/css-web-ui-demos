/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const PAGE_WIDTH = 5.0; // In WebGL units
const PAGE_HEIGHT = 8.0;

export function setupPhysicsRendering(canvas, containerId) {
    const gl = canvas.getContext('webgl2', {
        antialias: true,
        alpha: true,
        premultipliedAlpha: false
    });
    if (!gl) return;

    // --- SHADERS ---
    const vsSource = `#version 300 es
    layout(location=0) in vec3 aPosition;
    layout(location=1) in vec2 aTexCoord;
    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;
    out vec2 vTexCoord;
    void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
        vTexCoord = aTexCoord;
    }`;

    const fsSource = `#version 300 es
    precision highp float;
    in vec2 vTexCoord;
    uniform sampler2D uTex;
    out vec4 fragColor;

    void main() {
        vec4 color = texture(uTex, vTexCoord);
        if (color.a < 0.1) discard;
        fragColor = color;
    }`;

    const createShader = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
        return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, createShader(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);

    const uProj = gl.getUniformLocation(program, 'uProjection');
    const uView = gl.getUniformLocation(program, 'uView');
    const uModel = gl.getUniformLocation(program, 'uModel');

    // --- GEOMETRY (A simple unit plane) ---
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, -0.5, 0.5, 0, 0.5, 0.5, 0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

    // --- PHYSICS MANAGER ---
    class PhysicsElement {
        constructor(domElement, isCircle = false) {
            this.domEl = domElement;
            this.isCircle = isCircle;

            this.tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            this.active = false;
            this.domEl.style.visibility = 'hidden';
            this.domEl.style.pointerEvents = 'none';

            this.x = 0;
            this.y = 20;
            this.z = 0;

            this.vx = 0;
            this.vy = 0;

            this.rot = [0, 0, 0];
            this.rotV = [0, 0, 0];

            this.updateSize();

            // --- Drag Interaction ---
            this.isDragging = false;
            let lastMouse = null;
            let originalInvMass = this.invMass;

            this.domEl.addEventListener('mousedown', (e) => {
                if (!this.active) return;
                if (this.isDragging) return;
                this.isDragging = true;
                lastMouse = { x: e.clientX, y: e.clientY };
                originalInvMass = this.invMass;
                this.invMass = 0;
                this.vx = 0;
                this.vy = 0;
                this.rotV = [0, 0, 0];

                const onMouseMove = (ev) => {
                    if (!this.isDragging) return;
                    const dx = ev.clientX - lastMouse.x;
                    const dy = ev.clientY - lastMouse.y;
                    const scale = 12.5 / window.innerHeight;
                    const glDx = dx * scale;
                    const glDy = -dy * scale;
                    this.x += glDx;
                    this.y += glDy;
                    this.vx = glDx / 0.016;
                    this.vy = glDy / 0.016;
                    lastMouse = { x: ev.clientX, y: ev.clientY };
                };

                const onMouseUp = () => {
                    this.isDragging = false;
                    this.invMass = originalInvMass;
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        }

        updateSize() {
            this.width = this.domEl.offsetWidth / 80;
            this.height = this.domEl.offsetHeight / 80;

            if (this.isCircle) {
                // For circles, use a perfectly square bounding box; radius = half of that
                const size = Math.max(this.width, this.height);
                this.width = size;
                this.height = size;
                this.radius = size * 0.5;
            } else {
                this.radius = Math.min(this.width, this.height) * 0.55;
            }

            this.mass = this.width * this.height;
            this.invMass = 1 / this.mass;
        }

        getVertices() {
            const w = this.width * 0.5;
            const h = this.height * 0.5;
            const cos = Math.cos(this.rot[2]);
            const sin = Math.sin(this.rot[2]);
            const corners = [[-w, -h], [w, -h], [w, h], [-w, h]];
            return corners.map(([x, y]) => ({
                x: this.x + (x * cos - y * sin),
                y: this.y + (x * sin + y * cos)
            }));
        }

        reset() {
            this.updateSize();
            this.active = true;
            this.domEl.style.visibility = 'visible';
            this.x = (Math.random() - 0.5) * 3;
            this.y = 12;
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = 0;
            if (this.isCircle) {
                // Circles start without rotation torque (they roll naturally via friction)
                this.rot = [0, 0, 0];
                this.rotV = [0, 0, (Math.random() - 0.5) * 1];
            } else {
                this.rot = [0, 0, (Math.random() - 0.5)];
                this.rotV = [0, 0, (Math.random() - 0.5) * 2];
            }
        }

        update(dt) {
            if (!this.active) return;

            if (this.isDragging) {
                this.rotV[2] *= 0.9;
                this.rot[2] += this.rotV[2] * dt;
                if (gl.texElementImage2D) {
                    try {
                        gl.bindTexture(gl.TEXTURE_2D, this.tex);
                        gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.domEl);
                    } catch {}
                }
                return;
            }

            const gravity = -25;
            this.vy += gravity * dt;

            const drag = 0.999;
            const angularDrag = this.isCircle ? 0.995 : 0.98; // Circles spin longer
            this.vx *= drag;
            this.vy *= drag;
            this.rotV[2] *= angularDrag;

            if (!this.isCircle) {
                // Righting torque only for boxes, not circles
                const targetAngle = Math.round(this.rot[2] / Math.PI) * Math.PI;
                const angleDiff = targetAngle - this.rot[2];
                this.rotV[2] += angleDiff * 8.0 * dt;
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            const floor = -5;

            if (this.isCircle) {
                // Circle floor collision: center - radius < floor
                if ((this.y - this.radius) < floor) {
                    const overlap = floor - (this.y - this.radius);
                    this.y += overlap;
                    if (this.vy < 0) this.vy *= -0.6;
                    this.vx *= 0.98;
                    // Rolling friction: spin based on horizontal velocity
                    this.rotV[2] = -this.vx / this.radius;
                }
            } else {
                const verts = this.getVertices();
                let lowestY = Infinity;
                for (const v of verts) if (v.y < lowestY) lowestY = v.y;

                if (lowestY < floor) {
                    const overlap = floor - lowestY;
                    this.y += overlap;
                    if (this.vy < 0) this.vy *= -0.6;
                    this.vx *= 0.98;
                    this.rotV[2] *= 0.8;
                    lowestY = floor;
                }

                // Sleep logic for boxes
                if (Math.abs(this.vx) < 0.01) this.vx = 0;
                if (Math.abs(this.vy) < 0.01 && Math.abs(lowestY - floor) < 0.01) this.vy = 0;
                if (Math.abs(this.vy) < 0.05 && Math.abs(lowestY - floor) < 0.01) {
                    this.rotV[2] *= 0.7;
                    if (Math.abs(this.rotV[2]) < 0.01) this.rotV[2] = 0;
                }
            }

            // Wall collisions (same for all shapes, use radius or half-width)
            const wallLimit = 4.5;
            if (this.isCircle) {
                if (this.x + this.radius > wallLimit) {
                    this.x = wallLimit - this.radius;
                    this.vx *= -0.7;
                    this.rotV[2] = -this.vx / this.radius;
                }
                if (this.x - this.radius < -wallLimit) {
                    this.x = -wallLimit + this.radius;
                    this.vx *= -0.7;
                    this.rotV[2] = -this.vx / this.radius;
                }
            } else {
                const verts = this.getVertices();
                for (const v of verts) {
                    if (v.x > wallLimit) { this.x -= (v.x - wallLimit); this.vx *= -0.5; }
                    if (v.x < -wallLimit) { this.x += (-wallLimit - v.x); this.vx *= -0.5; }
                }
            }

            this.rot[2] += this.rotV[2] * dt;

            if (gl.texElementImage2D) {
                try {
                    gl.bindTexture(gl.TEXTURE_2D, this.tex);
                    gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.domEl);
                } catch {}
            }
        }

        getMatrix() {
            const m = mat4.create();
            mat4.translate(m, m, [this.x, this.y, this.z]);
            mat4.rotateZ(m, m, this.rot[2]);
            mat4.scale(m, m, [this.width, this.height, 1]);
            return m;
        }
    }

    // ─── Collision detection helpers ─────────────────────────────────────────

    function testCircleCircle(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;
        if (dist >= minDist || dist < 0.0001) return null;
        const nx = dx / dist;
        const ny = dy / dist;
        return { overlap: minDist - dist, normal: { x: nx, y: ny } };
    }

    function testOBBCollision(a, b) {
        const vertsA = a.getVertices();
        const vertsB = b.getVertices();
        const axes = [];
        for (let i = 0; i < 2; i++) {
            const p1 = vertsA[i]; const p2 = vertsA[(i + 1) % 4];
            const dx = p2.x - p1.x; const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            axes.push({ x: -dy / len, y: dx / len });
        }
        for (let i = 0; i < 2; i++) {
            const p1 = vertsB[i]; const p2 = vertsB[(i + 1) % 4];
            const dx = p2.x - p1.x; const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            axes.push({ x: -dy / len, y: dx / len });
        }
        let minOverlap = Infinity; let collisionNormal = null;
        for (const axis of axes) {
            let minA = Infinity, maxA = -Infinity;
            for (const v of vertsA) { const p = v.x * axis.x + v.y * axis.y; minA = Math.min(minA, p); maxA = Math.max(maxA, p); }
            let minB = Infinity, maxB = -Infinity;
            for (const v of vertsB) { const p = v.x * axis.x + v.y * axis.y; minB = Math.min(minB, p); maxB = Math.max(maxB, p); }
            const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
            if (overlap < 0) return null;
            if (overlap < minOverlap) { minOverlap = overlap; collisionNormal = axis; }
        }
        const aToB = { x: b.x - a.x, y: b.y - a.y };
        if (aToB.x * collisionNormal.x + aToB.y * collisionNormal.y < 0) {
            collisionNormal.x *= -1; collisionNormal.y *= -1;
        }
        return { overlap: minOverlap, normal: collisionNormal };
    }

    function testCircleOBB(circle, obb) {
        // Find the closest point on the OBB to the circle center
        const cos = Math.cos(-obb.rot[2]);
        const sin = Math.sin(-obb.rot[2]);
        // Rotate circle center into OBB local space
        const dx = circle.x - obb.x;
        const dy = circle.y - obb.y;
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        const hw = obb.width * 0.5;
        const hh = obb.height * 0.5;
        const clampedX = Math.max(-hw, Math.min(hw, localX));
        const clampedY = Math.max(-hh, Math.min(hh, localY));
        const closestX = obb.x + clampedX * Math.cos(obb.rot[2]) - clampedY * Math.sin(obb.rot[2]);
        const closestY = obb.y + clampedX * Math.sin(obb.rot[2]) + clampedY * Math.cos(obb.rot[2]);
        const distX = circle.x - closestX;
        const distY = circle.y - closestY;
        const dist = Math.sqrt(distX * distX + distY * distY);
        if (dist >= circle.radius || dist < 0.0001) return null;
        const nx = distX / dist;
        const ny = distY / dist;
        return { overlap: circle.radius - dist, normal: { x: nx, y: ny } };
    }

    function applyImpulse(a, b, nx, ny, overlap) {
        const restitution = 0.6;
        const friction = 0.1;
        const percent = 1.0;
        const slop = 0.001;
        const correctionMag = Math.max(overlap - slop, 0) * percent;
        const maxCorrection = 0.6;
        let correctionX = Math.max(-maxCorrection, Math.min(maxCorrection, correctionMag * nx));
        let correctionY = Math.max(-maxCorrection, Math.min(maxCorrection, correctionMag * ny));

        const invMassSum = a.invMass + b.invMass;
        if (invMassSum === 0) return;

        a.x -= correctionX * (a.invMass / invMassSum);
        a.y -= correctionY * (a.invMass / invMassSum);
        b.x += correctionX * (b.invMass / invMassSum);
        b.y += correctionY * (b.invMass / invMassSum);

        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const velAlongNormal = rvx * nx + rvy * ny;
        if (velAlongNormal > 0) return;

        const jImpulse = -(1 + restitution) * velAlongNormal / invMassSum;
        a.vx -= jImpulse * nx * a.invMass;
        a.vy -= jImpulse * ny * a.invMass;
        b.vx += jImpulse * nx * b.invMass;
        b.vy += jImpulse * ny * b.invMass;

        const tx = -ny; const ty = nx;
        const velTangent = rvx * tx + rvy * ty;
        const jt = -velTangent / invMassSum * friction;
        a.vx -= jt * tx * a.invMass;
        a.vy -= jt * ty * a.invMass;
        b.vx += jt * tx * b.invMass;
        b.vy += jt * ty * b.invMass;

        // Rolling torque for circles
        const spinThreshold = 0.3;
        if (Math.abs(velTangent) > spinThreshold) {
            const spinA = (a.isCircle && a.radius > 0) ? velTangent / a.radius * 0.3 : velTangent * 0.05;
            const spinB = (b.isCircle && b.radius > 0) ? -velTangent / b.radius * 0.3 : -velTangent * 0.05;
            a.rotV[2] -= spinA;
            b.rotV[2] += spinB;
        }

        if (Math.abs(velAlongNormal) < 0.2) {
            a.vy = 0;
            b.vy = 0;
        }
    }

    function resolveCollisions(elements) {
        for (let iter = 0; iter < 12; iter++) {
            for (let i = 0; i < elements.length; i++) {
                for (let j = i + 1; j < elements.length; j++) {
                    const a = elements[i];
                    const b = elements[j];

                    let collision = null;
                    if (a.isCircle && b.isCircle) {
                        collision = testCircleCircle(a, b);
                    } else if (a.isCircle && !b.isCircle) {
                        collision = testCircleOBB(a, b);
                        if (collision) collision.normal = { x: -collision.normal.x, y: -collision.normal.y };
                        // Swap A and B for direction consistency
                        if (collision) {
                            applyImpulse(b, a, -collision.normal.x, -collision.normal.y, collision.overlap);
                            continue;
                        }
                    } else if (!a.isCircle && b.isCircle) {
                        collision = testCircleOBB(b, a);
                    } else {
                        collision = testOBBCollision(a, b);
                    }

                    if (collision) {
                        applyImpulse(a, b, collision.normal.x, collision.normal.y, collision.overlap);
                    }
                }
            }
        }
    }

    const elements = Array.from(canvas.querySelectorAll('.physics-item, .ball')).map(el => {
        const isCircle = el.classList.contains('ball');
        return new PhysicsElement(el, isCircle);
    });

    const projection = mat4.create();
    const view = mat4.create();
    mat4.lookAt(view, [0, 0, 15], [0, 0, 0], [0, 1, 0]);

    let lastTime = 0;
    function render(time) {
        const dt = Math.min(0.05, (time - lastTime) / 1000);
        lastTime = time;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(program);

        mat4.perspective(projection, 45 * Math.PI / 180, canvas.width / canvas.height, 0.1, 1000);
        gl.uniformMatrix4fv(uProj, false, projection);
        gl.uniformMatrix4fv(uView, false, view);

        const toCSSViewport = new DOMMatrix()
            .translate(canvas.width / 2, canvas.height / 2)
            .scale(canvas.width / 2, -canvas.height / 2, 1);

        for (const p of elements) p.update(dt);
        resolveCollisions(elements);

        for (const p of elements) {
            const model = p.getMatrix();
            gl.uniformMatrix4fv(uModel, false, model);
            gl.bindTexture(gl.TEXTURE_2D, p.tex);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            if (canvas.getElementTransform) {
                try {
                    const w = p.domEl.offsetWidth;
                    const h = p.domEl.offsetHeight;
                    const toGLModel = new DOMMatrix()
                        .scale(1 / 80, -1 / 80, 1)
                        .translate(-w / 2, -h / 2);

                    const mvp = mat4.create();
                    mat4.multiply(mvp, projection, view);
                    mat4.multiply(mvp, mvp, model);

                    const finalT = toCSSViewport.multiply(new DOMMatrix(Array.from(mvp))).multiply(toGLModel);
                    const syncT = canvas.getElementTransform(p.domEl, finalT);
                    if (syncT) p.domEl.style.transform = syncT.toString();
                    p.domEl.style.visibility = 'visible';
                    p.domEl.style.pointerEvents = 'auto';
                    p.domEl.style.zIndex = Math.round(p.z * 100) + 1000;
                } catch (e) {}
            }
        }

        requestAnimationFrame(render);
    }

    window.addEventListener('resize', () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        gl.viewport(0, 0, canvas.width, canvas.height);
    });
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(render);

    let spawnTimeouts = [];
    const pEngine = {
        spawn: () => {
            spawnTimeouts.forEach(clearTimeout);
            spawnTimeouts = [];
            elements.forEach(e => {
                e.active = false;
                e.domEl.style.visibility = 'hidden';
                e.domEl.style.pointerEvents = 'none';
            });
            elements.forEach((e, i) => {
                spawnTimeouts.push(setTimeout(() => e.reset(), i * 600));
            });
        },
        add: (domEl, isCircle = false) => {
            const pe = new PhysicsElement(domEl, isCircle);
            elements.push(pe);
            pe.reset();
        }
    };

    setTimeout(() => pEngine.spawn(), 500);
    return pEngine;
}
