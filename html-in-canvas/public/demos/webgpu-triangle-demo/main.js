const canvas = document.querySelector('canvas');
const uiElement = document.getElementById('ui-element');

if (!navigator.gpu) {
  alert("WebGPU is not supported in this browser.");
  throw new Error("WebGPU not supported");
}

const adapter = await navigator.gpu.requestAdapter({
  featureLevel: 'compatibility',
});
if (!adapter) {
  alert("WebGPU compatibility mode not available.");
  throw new Error("WebGPU compatibility mode not available");
}

const device = await adapter.requestDevice();
if (!device) {
  alert("Failed to request WebGPU device.");
  throw new Error("Failed to request WebGPU device");
}

const context = canvas.getContext('webgpu');

const devicePixelRatio = window.devicePixelRatio || 1;
canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

context.configure({
  device,
  format: presentationFormat,
  alphaMode: 'opaque',
});

const targetTexture = device.createTexture({
  size: [200, 200, 1],
  format: 'bgra8unorm',
  usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
});

// Simple MVP matrix for 2D/3D projection mapping
const htmlElementMVP = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
]);

const triangleVertWGSL = `
struct VertexOutput {
  @builtin(position) position : vec4f,
}

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
  var pos = array<vec2f, 3>(
    vec2f(0.0, 0.5),
    vec2f(-0.5, -0.5),
    vec2f(0.5, -0.5)
  );

  var out : VertexOutput;
  out.position = vec4f(pos[vertexIndex], 0.0, 1.0);
  return out;
}
`;

const redFragWGSL = `
@fragment
fn fs_main() -> @location(0) vec4f {
  return vec4f(1.0, 1.0, 1.0, 1.0);
}
`;

const pipeline = device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    module: device.createShaderModule({
      code: triangleVertWGSL,
    }),
  },
  fragment: {
    module: device.createShaderModule({
      code: redFragWGSL,
    }),
    targets: [
      {
        format: presentationFormat,
      },
    ],
  },
  primitive: {
    topology: 'triangle-list',
  },
});

// HTML-in-Canvas script BEGIN
if (uiElement) {
  canvas.onpaint = (event) => {
    if (!event.changedElements?.length > 0) {
      // No canvas children changed -> no re-rendering needed
      console.log("No rerendering of canvas children")
      return
    }
    console.log("Onpaint triggered")
    if (device.queue.copyElementImageToTexture) {
      console.log("copyElementImageToTexture method supported")
      try {
        // This if block is used to ensure older browser support before the WebGPU signature update
        if (device.queue.copyElementImageToTexture.length === 2) {
          const sourceDict = { source: uiElement };
          const destDict = {
            destination: { texture: targetTexture },
            width: 200,
            height: 200
          };
          device.queue.copyElementImageToTexture(sourceDict, destDict);
        } else {
          device.queue.copyElementImageToTexture(
            uiElement,
            200,
            200,
            { texture: targetTexture }
          );
        }
        console.log("copyElementImageToTexture method executed successfully")
      } catch (err) {
        console.error("Failed to copy element image to texture:", err);
      }
    }

    if (canvas.getElementTransform) {
      console.log("canvas return element transform")
      const mvpDOM = new DOMMatrix(Array.from(htmlElementMVP));
      const dprX = canvas.width / canvas.clientWidth;
      const dprY = canvas.height / canvas.clientHeight;
      const gridWidth = uiElement.offsetWidth * dprX;
      const gridHeight = uiElement.offsetHeight * dprY;

      const cssToUnitSpace = new DOMMatrix()
        .scale(1 / gridWidth, -1 / gridHeight, 1 / gridHeight)
        .translate(-gridWidth / 2, -gridHeight / 2);

      const clipToCanvasViewport = new DOMMatrix()
        .translate(canvas.width / 2, canvas.height / 2)
        .scale(canvas.width / 2, -canvas.height / 2, canvas.height / 2);

      const screenSpaceTransform = clipToCanvasViewport
        .multiply(mvpDOM)
        .multiply(cssToUnitSpace);

      const computedTransform = canvas.getElementTransform(uiElement, screenSpaceTransform);
      if (computedTransform) {
        uiElement.style.transform = computedTransform.toString();
      }
    }
  };
}
// HTML-in-Canvas script END

const observer = new ResizeObserver(([entry]) => {
    canvas.width = entry.devicePixelContentBoxSize[0].inlineSize;
    canvas.height = entry.devicePixelContentBoxSize[0].blockSize;
    if (typeof canvas.requestPaint === 'function') {
      canvas.requestPaint();
    }
  });
  observer.observe(canvas, { box: "device-pixel-content-box" });

function frame() {
  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();

  const renderPassDescriptor = {
    colorAttachments: [
      {
        view: textureView,
        clearValue: [0, 0, 0, 1], // Clear to solid black so the triangle is visible over it
        loadOp: 'clear',
        storeOp: 'store',
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.draw(3);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
  canvas.requestPaint();
  requestAnimationFrame(frame);

}

requestAnimationFrame(frame);