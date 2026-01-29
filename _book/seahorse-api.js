/**
 * Seahorse WebR Bridge
 * 
 * Minimal JavaScript API for LLM interaction with WebR.
 * All analysis logic lives in the seahtrue R package - this just handles:
 * - File upload to WebR filesystem
 * - R code execution
 * - Reading results
 * 
 * Author: Vincent de Boer
 */

(function() {
  'use strict';

  let _webRInstance = null;

  /**
   * Get WebR instance from quarto-live's OJS runtime
   */
  async function getWebRInstance() {
    if (_webRInstance) return _webRInstance;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebR timeout - run a code block first'));
      }, 30000);

      const poll = setInterval(() => {
        try {
          const scope = window._ojs?.ojsConnector?.mainModule?._scope;
          if (!scope) return;

          scope.forEach((variable, key) => {
            if (key === 'webROjs' && variable._value?.webRPromise) {
              clearInterval(poll);
              clearTimeout(timeout);
              variable._value.webRPromise.then(webR => {
                _webRInstance = webR;
                console.log('[seahorseAPI] WebR ready');
                resolve(webR);
              }).catch(reject);
            }
          });
        } catch (e) { /* keep polling */ }
      }, 100);
    });
  }

  /**
   * Upload file to WebR filesystem
   */
  async function uploadFile(data, filename) {
    const webR = await getWebRInstance();
    
    // Convert to Uint8Array
    let uint8Data;
    if (data instanceof File) {
      uint8Data = new Uint8Array(await data.arrayBuffer());
    } else if (data instanceof ArrayBuffer) {
      uint8Data = new Uint8Array(data);
    } else if (data instanceof Uint8Array) {
      uint8Data = data;
    } else if (typeof data === 'string') {
      // base64
      const binary = atob(data);
      uint8Data = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        uint8Data[i] = binary.charCodeAt(i);
      }
    } else {
      throw new Error('Unsupported data type');
    }

    const cleanName = filename.replace(/^.*[\\/]/, '');
    await webR.FS.writeFile('/home/web_user/' + cleanName, uint8Data);
    
    return { success: true, filename: cleanName };
  }

  /**
   * Execute R code and return result
   */
  async function evalR(code) {
    const webR = await getWebRInstance();
    const result = await webR.evalR(code);
    
    if (result.toArray) return await result.toArray();
    if (result.toString) return await result.toString();
    return result;
  }

  /**
   * Check if API is ready
   */
  async function isReady() {
    try {
      await getWebRInstance();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create upload widget UI
   */
  function createUploadWidget() {
    const existing = document.getElementById('seahorse-upload');
    if (existing) existing.remove();

    const widget = document.createElement('div');
    widget.id = 'seahorse-upload';
    widget.innerHTML = `
      <div style="padding:20px;margin:20px 0;border:2px solid #27ae60;border-radius:12px;background:#f0fff4;font-family:system-ui,sans-serif;">
        <h4 style="margin:0 0 15px;color:#27ae60;">📤 Upload Your Seahorse File</h4>
        <div id="drop-zone" style="border:2px dashed #27ae60;border-radius:8px;padding:30px;text-align:center;background:white;cursor:pointer;">
          <input type="file" id="file-input" accept=".xlsx,.xls" hidden />
          <p style="margin:0;color:#666;"><strong>Drag & drop</strong> your .xlsx file here<br><span style="font-size:0.9em">or click to browse</span></p>
        </div>
        <div id="status" style="margin-top:15px;padding:12px;border-radius:8px;display:none;"></div>
      </div>
    `;

    const target = document.querySelector('main') || document.body;
    target.insertBefore(widget, target.firstChild);

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const status = document.getElementById('status');

    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.background = '#e8f8f5'; };
    dropZone.ondragleave = () => { dropZone.style.background = 'white'; };
    dropZone.ondrop = async (e) => {
      e.preventDefault();
      dropZone.style.background = 'white';
      if (e.dataTransfer.files[0]) await handleFile(e.dataTransfer.files[0]);
    };
    fileInput.onchange = (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); };

    async function handleFile(file) {
      status.style.display = 'block';
      status.style.background = '#fff3cd';
      status.textContent = '⏳ Uploading...';

      try {
        const result = await uploadFile(file, file.name);
        status.style.background = '#d4edda';
        status.innerHTML = '✅ Uploaded! Use in R: <code style="background:#eee;padding:2px 6px;border-radius:4px;">"' + result.filename + '"</code>';
        window._uploadedFile = result.filename;
      } catch (err) {
        status.style.background = '#f8d7da';
        status.textContent = '❌ Error: ' + err.message;
      }
    }
  }

  // Expose minimal API
  window.seahorseAPI = {
    uploadFile,    // Write file to WebR
    evalR,         // Run R code
    isReady,       // Check if WebR is ready
    createUploadWidget,  // Create file picker UI
    getWebRInstance      // Direct WebR access
  };

  console.log('[seahorseAPI] Loaded');
})();
