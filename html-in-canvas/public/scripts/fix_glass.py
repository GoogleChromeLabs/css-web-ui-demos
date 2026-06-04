# Copyright 2026 Google LLC
# SPDX-License-Identifier: Apache-2.0

import re

with open("webgl-liquid-glass-take2.html", "r") as f:
    text = f.read()

# 1. Canvas Layout Subtree
canvas_replacement = """<canvas id="gl-canvas" layoutsubtree>
  <div id="ui-container" style="width: 100vw; height: 100vh; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); display: flex; align-items: center; justify-content: center; color: white; box-sizing: border-box;">
    <div style="background: rgba(255,255,255,0.1); padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3);">
      <h1 style="margin: 0 0 20px 0; font-family: sans-serif;">Liquid Glass UI</h1>
      <p style="margin: 0 0 30px 0; font-size: 18px; max-width: 400px; line-height: 1.5;">Drag the glass element around to see how WebGL refracts this auto-generated HTML content using texElementImage2D.</p>
      <button style="padding: 12px 24px; font-size: 16px; border-radius: 8px; border: none; background: white; color: #1e3c72; cursor: pointer; font-weight: bold; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">Interactive Button</button>
    </div>
  </div>
</canvas>"""
text = text.replace('<canvas id="gl-canvas"></canvas>', canvas_replacement)


# 2. updateGlassDOM
update_dom_repl = """  function updateGlassDOM() {
    // getElementTransform handles the sync now, so we don't manually apply left/top
    // glassEl.style.left = `${glassX - glassWidth / 2}px`;
    // glassEl.style.top = `${glassY - glassHeight / 2}px`;
  }"""
text = re.sub(r"  function updateGlassDOM\(\) \{.*?\}", update_dom_repl, text, flags=re.DOTALL)


# 3. Replace bg texture generation
bg_tex_repl = """  const uiContainer = document.getElementById('ui-container');

  const bgTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, bgTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);"""
text = re.sub(r"  // -- Generate Background Texture.*?const bgTexture = generateBgTexture\(\);", bg_tex_repl, text, flags=re.DOTALL)


# 4. Update vsBackground
vs_bg_repl = """  // Background Shader
  const vsBackground = `#version 300 es
  layout(location = 0) in vec3 aPosition;
  layout(location = 1) in vec2 aTexCoord;
  out vec2 vTexCoord;
  void main() {
    gl_Position = vec4(aPosition, 1.0);
    // UI texture flipped Y
    vTexCoord = vec2(aTexCoord.x, 1.0 - aTexCoord.y);
  }`;"""
text = re.sub(r"  // Background Shader\n  const vsBackground = `#version 300 es.*?  \}`;", vs_bg_repl, text, flags=re.DOTALL)


# 5. Update fsGlass Y-flip and sampling
fs_glass_repl = """  const fsGlass = `#version 300 es
  precision highp float;
  in vec2 vTexCoord;
  
  uniform sampler2D uBackgroundTex;
  uniform sampler2D uDispTex;
  uniform sampler2D uSpecTex;
  uniform vec2 uResolution;
  
  out vec4 fragColor;

  void main() {
    // HTML is top-down, gl_FragCoord is bottom-up
    vec2 baseBgUV = gl_FragCoord.xy / uResolution;
    baseBgUV.y = 1.0 - baseBgUV.y; 

    // Displacement Math (Liquid Glass Physics)
    vec4 dispColor = texture(uDispTex, vTexCoord);
    vec2 displacement = (dispColor.rg - 0.5) * 2.0;
    
    // Configurable Refraction Strength
    float refStr = 0.08; 
    
    // Chromatic Aberration offset
    float chromAb = 0.01;

    // Sample Refracted Background
    float r = texture(uBackgroundTex, baseBgUV + displacement * (refStr + chromAb)).r;
    float g = texture(uBackgroundTex, baseBgUV + displacement * refStr).g;
    float b = texture(uBackgroundTex, baseBgUV + displacement * (refStr - chromAb)).b;
    vec3 refractedColor = vec3(r, g, b);

    // Optional: Boost brightness/saturation like curved glass concentrating light
    refractedColor *= 1.1;

    // Specular Highlight mapping
    vec4 specular = texture(uSpecTex, vTexCoord);
    // Add specular highlight over the refracted color using its intensity
    vec3 finalColor = refractedColor + (specular.rgb * specular.a * 1.5);
    
    fragColor = vec4(finalColor, 1.0);
  }`;"""
text = re.sub(r"  const fsGlass = `#version 300 es.*?  \}`;", fs_glass_repl, text, flags=re.DOTALL)


# 6. Render loop update
render_loop_repl = """  // -- Render Loop --
  function render() {
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Update UI Texture every frame if API exists
    if (gl.texElementImage2D) {
      gl.bindTexture(gl.TEXTURE_2D, bgTexture);
      // This if block is used to ensure older browser support before the breaking update in Chromium 150
      // See https://github.com/WICG/html-in-canvas/pull/128/changes
      if (gl.texElementImage2D.length === 3) {
        gl.texElementImage2D(gl.TEXTURE_2D, gl.RGBA8, uiContainer);
      } else {
        gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uiContainer);
      }
    }

    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 1. Draw Background
    gl.useProgram(progBg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.uniform1i(gl.getUniformLocation(progBg, 'uBackgroundTex'), 0);
    
    gl.bindVertexArray(quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 2. Draw Glass Quad
    gl.useProgram(progGlass);
    
    // Bind uniforms
    gl.uniform2f(gl.getUniformLocation(progGlass, 'uResolution'), canvas.width, canvas.height);
    
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.uniform1i(gl.getUniformLocation(progGlass, 'uBackgroundTex'), 0);
    
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, dispTex);
    gl.uniform1i(gl.getUniformLocation(progGlass, 'uDispTex'), 1);
    
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, specTex);
    gl.uniform1i(gl.getUniformLocation(progGlass, 'uSpecTex'), 2);

    // Calculate Matrix mapping from glass coordinates to Clip Space
    // Screen is w, h
    const proj = mat4.create();
    mat4.ortho(proj, 0, canvas.width, canvas.height, 0, -1, 1);
    
    const model = mat4.create();
    // Translate to center of glass
    mat4.translate(model, model, [glassX, glassY, 0]);
    // Scale by half width/height (quad goes from -1 to 1 = width 2)
    mat4.scale(model, model, [glassWidth / 2, glassHeight / 2, 1]);

    const mvp = mat4.create();
    mat4.multiply(mvp, proj, model);

    gl.uniformMatrix4fv(gl.getUniformLocation(progGlass, 'uMVP'), false, mvp);

    if (canvas.getElementTransform) {
      // 1. Convert the MVP matrix to a DOMMatrix
      const mvpDOM = new DOMMatrix(Array.from(mvp));

      // 2. Element CSS pixels -> WebGL Model Space
      // Element is 'glassWidth' x 'glassHeight'. Quad geometry is -1 to 1 (size 2).
      const toGLModel = new DOMMatrix()
        // Scale pixels to 2 units, flip Y (CSS down, GL up)
        .scale(2 / glassWidth, -2 / glassHeight, 1)
        // Center the origin: (0,0) becomes (-width/2, -height/2) before scaling
        .translate(-glassWidth / 2, -glassHeight / 2);

      // 3. WebGL Clip Space -> Canvas CSS pixels (Viewport Transform)
      const toCSSViewport = new DOMMatrix()
        // Move center (0,0) to center of canvas
        .translate(canvas.width / 2, canvas.height / 2)
        // Scale normalized clip (-1..1) to viewport size
        .scale(canvas.width / 2, -canvas.height / 2, 1);

      // 4. Combine: Viewport * MVP * Model
      const finalTransform = toCSSViewport.multiply(mvpDOM).multiply(toGLModel);

      const transform = canvas.getElementTransform(glassEl, finalTransform);
      if (transform) {
        // Must origin transform from top-left because our math assumes (0,0) mapped to origin in DOM geometry steps
        glassEl.style.transformOrigin = '0 0';
        glassEl.style.transform = transform.toString();
        // Clear manual offsets just in case
        glassEl.style.left = '0';
        glassEl.style.top = '0';
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
  }"""
text = re.sub(r"  // -- Render Loop --.*?\}\n\n  requestAnimationFrame\(render\);", render_loop_repl + "\n\n  requestAnimationFrame(render);", text, flags=re.DOTALL)


with open("webgl-liquid-glass-take2.html", "w") as f:
    f.write(text)

