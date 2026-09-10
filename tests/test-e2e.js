const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function runE2ETest() {
  console.log('--- Starting End-to-End Headless Chrome Validation Test ---');

  const port = 9222;
  const htmlPath = path.resolve(__dirname, '../index.html');
  const fileUrl = 'file://' + htmlPath;

  // Start Chrome
  const chromeProcess = spawn('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    '--remote-allow-origins=*',
    fileUrl
  ]);

  let chromeExited = false;
  chromeProcess.on('exit', () => { chromeExited = true; });

  try {
    // Wait for CDP to be available
    let tabs = null;
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      try {
        tabs = await getJson(`http://127.0.0.1:${port}/json`);
        if (tabs && tabs.length > 0) break;
      } catch (e) {
        // retry
      }
    }

    if (!tabs || tabs.length === 0) {
      throw new Error('Failed to connect to Chrome DevTools port ' + port);
    }

    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const wsUrl = pageTab.webSocketDebuggerUrl;
    console.log('Connected to Chrome DevTools endpoint');

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        const { resolve, reject } = callbacks.get(data.id);
        callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };

    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = msgId++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    // Enable Page and Runtime
    await sendCommand('Runtime.enable');
    await sendCommand('Page.enable');
    await sleep(500);

    async function evalCode(expression) {
      const res = await sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error('Eval error: ' + JSON.stringify(res.exceptionDetails));
      }
      return res.result ? res.result.value : undefined;
    }

    // --- STEP 1: Check Initial Page State ---
    console.log('\n[1] Checking Initial Page State...');
    const initialCopyDisabled = await evalCode(`document.getElementById('copyMarkdownBtn').hasAttribute('disabled')`);
    const initialDownloadDisabled = await evalCode(`document.getElementById('downloadMarkdownBtn').hasAttribute('disabled')`);
    const statusText = await evalCode(`document.getElementById('statusBadgeText').textContent`);

    console.log(`Initial Copy Disabled: ${initialCopyDisabled}`);
    console.log(`Initial Download Disabled: ${initialDownloadDisabled}`);
    console.log(`Initial Status: ${statusText}`);

    if (!initialCopyDisabled || !initialDownloadDisabled) {
      throw new Error('Export buttons MUST be disabled on initial blank form!');
    }
    if (!statusText.includes('missing')) {
      throw new Error('Status badge must show missing requirements!');
    }
    console.log('\u2713 Initial disabled validation state confirmed.');

    // --- STEP 2: Click "Load Demo Data" button ---
    console.log('\n[2] Loading Demo Bug Pack Data...');
    await evalCode(`document.getElementById('sampleDataBtn').click()`);
    await sleep(400);

    const filledStatus = await evalCode(`document.getElementById('statusBadgeText').textContent`);
    const isCopyEnabled = await evalCode(`!document.getElementById('copyMarkdownBtn').hasAttribute('disabled')`);
    const isDownloadEnabled = await evalCode(`!document.getElementById('downloadMarkdownBtn').hasAttribute('disabled')`);
    const screenshotsCount = await evalCode(`document.querySelectorAll('.screenshot-card').length`);
    const stepsCount = await evalCode(`document.querySelectorAll('.step-item').length`);
    const rawMarkdown = await evalCode(`document.getElementById('rawMarkdownView').textContent`);

    console.log(`Status after demo load: ${filledStatus}`);
    console.log(`Copy Button Enabled: ${isCopyEnabled}`);
    console.log(`Download Button Enabled: ${isDownloadEnabled}`);
    console.log(`Screenshots Rendered: ${screenshotsCount}`);
    console.log(`Steps Rendered: ${stepsCount}`);

    if (!isCopyEnabled || !isDownloadEnabled) {
      throw new Error('Export buttons MUST be enabled when all required fields are valid!');
    }
    if (filledStatus !== 'Ready to Export') {
      throw new Error('Status badge should show "Ready to Export"!');
    }
    if (screenshotsCount !== 2) {
      throw new Error(`Expected 2 demo screenshots, found ${screenshotsCount}`);
    }
    if (stepsCount !== 5) {
      throw new Error(`Expected 5 demo steps, found ${stepsCount}`);
    }

    // Validate Markdown content requirements
    if (!rawMarkdown.startsWith('# Checkout modal crashes on clicking Apply Promo Code')) {
      throw new Error('Markdown missing H1 title');
    }
    if (!rawMarkdown.includes('## Environment')) {
      throw new Error('Markdown missing Environment section');
    }
    if (!rawMarkdown.includes('## Steps to Reproduce') || !rawMarkdown.includes('1. Log into the staging environment')) {
      throw new Error('Markdown missing numbered steps');
    }
    if (!rawMarkdown.includes('## Expected Behavior') || !rawMarkdown.includes('## Actual Behavior')) {
      throw new Error('Markdown missing Expected/Actual sections');
    }
    if (!rawMarkdown.includes('## Screenshots & Evidence') || !rawMarkdown.includes('checkout-unhandled-exception.png')) {
      throw new Error('Markdown missing screenshots section / filenames');
    }
    if (!rawMarkdown.includes('![screenshot-1](checkout-unhandled-exception.png)')) {
      throw new Error('Markdown missing screenshot placeholder');
    }
    if (!rawMarkdown.includes('Generated by staging-bug-pack')) {
      throw new Error('Markdown missing footer note');
    }
    console.log('\u2713 Demo data loaded and markdown output verified perfectly!');

    // --- STEP 3: Invalidate a required field (Title) ---
    console.log('\n[3] Testing Live Invalidation (clearing Title)...');
    await evalCode(`
      const t = document.getElementById('issueTitle');
      t.value = '';
      t.dispatchEvent(new Event('input', { bubbles: true }));
    `);
    await sleep(200);

    const copyDisabledAfterClear = await evalCode(`document.getElementById('copyMarkdownBtn').hasAttribute('disabled')`);
    const titleHasErrorClass = await evalCode(`document.getElementById('titleGroup').classList.contains('has-error')`);
    const titleErrorMessage = await evalCode(`document.getElementById('titleGroup').querySelector('.error-message').textContent`);
    const statusAfterClear = await evalCode(`document.getElementById('statusBadgeText').textContent`);

    console.log(`Copy button disabled after clearing title: ${copyDisabledAfterClear}`);
    console.log(`Title field has .has-error: ${titleHasErrorClass}`);
    console.log(`Title error message: "${titleErrorMessage}"`);
    console.log(`Status badge: "${statusAfterClear}"`);

    if (!copyDisabledAfterClear) {
      throw new Error('Copy button MUST become disabled immediately when title is cleared!');
    }
    if (!titleHasErrorClass || !titleErrorMessage.includes('Title is required')) {
      throw new Error('Inline error for missing Title must be visible!');
    }
    console.log('\u2713 Live invalidation and inline error display confirmed.');

    // --- STEP 4: Restore Title and test dynamic steps management ---
    console.log('\n[4] Restoring Title and testing Dynamic Steps management...');
    await evalCode(`{
      const titleEl = document.getElementById('issueTitle');
      titleEl.value = 'Repaired Title';
      titleEl.dispatchEvent(new Event('input', { bubbles: true }));
    }`);
    await sleep(200);

    const restoredEnabled = await evalCode(`!document.getElementById('copyMarkdownBtn').hasAttribute('disabled')`);
    if (!restoredEnabled) throw new Error('Form should be valid again after restoring title');

    // Add a new step
    await evalCode(`document.getElementById('addStepBtn').click()`);
    const stepsCountAfterAdd = await evalCode(`document.querySelectorAll('.step-item').length`);
    console.log(`Steps count after Add Step: ${stepsCountAfterAdd} (was 5)`);
    if (stepsCountAfterAdd !== 6) throw new Error('Step was not added');

    // Remove the newly added step
    await evalCode(`{
      const deleteButtons = document.querySelectorAll('.step-item .btn-delete');
      deleteButtons[deleteButtons.length - 1].click();
    }`);
    const stepsCountAfterDelete = await evalCode(`document.querySelectorAll('.step-item').length`);
    console.log(`Steps count after Delete Step: ${stepsCountAfterDelete}`);
    if (stepsCountAfterDelete !== 5) throw new Error('Step was not deleted');
    console.log('\u2713 Dynamic steps add/remove verified.');

    // --- STEP 5: Switch Preview Tabs (Raw vs Rendered) ---
    console.log('\n[5] Testing Preview Tabs...');
    await evalCode(`document.getElementById('tabRenderedBtn').click()`);
    await sleep(150);
    const isRenderedVisible = await evalCode(`document.getElementById('renderedMarkdownView').style.display !== 'none'`);
    const isRawHidden = await evalCode(`document.getElementById('rawMarkdownView').style.display === 'none'`);
    const renderedH1 = await evalCode(`document.getElementById('renderedMarkdownView').querySelector('h1').textContent`);
    console.log(`Rendered tab visible: ${isRenderedVisible}, Raw hidden: ${isRawHidden}`);
    console.log(`Rendered H1: "${renderedH1}"`);

    if (!isRenderedVisible || !isRawHidden || renderedH1 !== 'Repaired Title') {
      throw new Error('Rendered markdown view tab failed to switch or render correctly!');
    }

    // Switch back to raw
    await evalCode(`document.getElementById('tabRawBtn').click()`);
    const isRawVisibleAgain = await evalCode(`document.getElementById('rawMarkdownView').style.display !== 'none'`);
    if (!isRawVisibleAgain) throw new Error('Failed to switch back to Raw Markdown tab');
    console.log('\u2713 Preview tab switching verified.');

    // --- STEP 6: Take a screenshot of the running UI ---
    console.log('\n[6] Capturing Headless Screenshot for Visual Verification...');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 960,
      deviceScaleFactor: 1,
      mobile: false
    });
    const screenshotResult = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const screenshotPath = path.resolve(__dirname, 'app-screenshot.png');
    fs.writeFileSync(screenshotPath, Buffer.from(screenshotResult.data, 'base64'));
    console.log(`\u2713 Saved visual screenshot to: ${screenshotPath}`);

    ws.close();
    console.log('\n>>> ALL END-TO-END VALIDATION TESTS PASSED WITH 100% SUCCESS! <<<');
  } finally {
    if (!chromeExited) {
      chromeProcess.kill('SIGKILL');
    }
  }
}

runE2ETest().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
