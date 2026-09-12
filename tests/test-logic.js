const assert = require('assert');
const {
  validateBugPack
} = require('../js/validator.js');
const {
  generateBugPackMarkdown,
  buildGithubNewIssueUrl,
  isGithubIssueUrlTooLong,
  planGithubIssueOpen,
  GITHUB_NEW_ISSUE_URL_MAX
} = require('../js/markdown.js');

console.log('--- Running Staging Bug Pack Unit Tests ---');

// Test 1: Empty data should be invalid with all required field errors
{
  const res = validateBugPack({});
  assert.strictEqual(res.isValid, false, 'Empty data must be invalid');
  assert.ok(res.errors.title, 'Should have title error');
  assert.ok(res.errors.browser, 'Should have browser error');
  assert.ok(res.errors.os, 'Should have os error');
  assert.ok(res.errors.steps, 'Should have steps error');
  assert.ok(res.errors.expected, 'Should have expected error');
  assert.ok(res.errors.actual, 'Should have actual error');
  console.log('✓ Test 1 Passed: Empty form validation flags all required fields');
}

// Test 2: Whitespace-only values should be treated as empty
{
  const res = validateBugPack({
    title: '   ',
    browser: '   ',
    os: '   ',
    steps: ['   ', ''],
    expected: '  ',
    actual: '  '
  });
  assert.strictEqual(res.isValid, false, 'Whitespace-only data must be invalid');
  assert.ok(res.errors.title);
  assert.ok(res.errors.browser);
  assert.ok(res.errors.os);
  assert.ok(res.errors.steps);
  assert.ok(res.errors.expected);
  assert.ok(res.errors.actual);
  console.log('✓ Test 2 Passed: Whitespace-only values are properly rejected');
}

// Test 3: Steps validation requires at least one non-empty step
{
  const resEmptySteps = validateBugPack({
    title: 'Valid title',
    browser: 'Chrome 128',
    os: 'macOS 14',
    steps: [],
    expected: 'Should load',
    actual: 'Crashed'
  });
  assert.strictEqual(resEmptySteps.isValid, false);
  assert.ok(resEmptySteps.errors.steps);

  const resOneValidStep = validateBugPack({
    title: 'Valid title',
    browser: 'Chrome 128',
    os: 'macOS 14',
    steps: ['', 'Click submit button', '  '],
    expected: 'Should load',
    actual: 'Crashed'
  });
  assert.strictEqual(resOneValidStep.isValid, true);
  assert.strictEqual(resOneValidStep.errors.steps, undefined);
  console.log('✓ Test 3 Passed: Steps validation requires at least 1 non-empty step');
}

// Test 4: Screenshots limit enforcement (0 - 5 allowed, > 5 rejected)
{
  const res5Screenshots = validateBugPack({
    title: 'Valid title',
    browser: 'Chrome 128',
    os: 'macOS 14',
    steps: ['Step 1'],
    expected: 'Works',
    actual: 'Fails',
    screenshots: [
      { name: '1.png' },
      { name: '2.png' },
      { name: '3.png' },
      { name: '4.png' },
      { name: '5.png' }
    ]
  });
  assert.strictEqual(res5Screenshots.isValid, true, '5 screenshots must be allowed');

  const res6Screenshots = validateBugPack({
    title: 'Valid title',
    browser: 'Chrome 128',
    os: 'macOS 14',
    steps: ['Step 1'],
    expected: 'Works',
    actual: 'Fails',
    screenshots: [
      { name: '1.png' },
      { name: '2.png' },
      { name: '3.png' },
      { name: '4.png' },
      { name: '5.png' },
      { name: '6.png' }
    ]
  });
  assert.strictEqual(res6Screenshots.isValid, false, '6 screenshots must be rejected');
  assert.ok(res6Screenshots.errors.screenshots);
  console.log('✓ Test 4 Passed: 0-5 screenshots limit enforced');
}

// Test 5: Markdown Generation Structure
{
  const bugData = {
    title: 'Checkout 500 error when applying invalid promo code',
    stagingUrl: 'https://staging.acme.shop/checkout',
    browser: 'Chrome 128.0.6613.85',
    os: 'macOS Sonoma 14.6.1',
    testAccountNotes: 'Role: Admin, Workspace: US-East-Staging',
    steps: [
      'Open the cart page with 1 item',
      'Click on "Enter promo code"',
      'Type "DISCOUNT99" and hit Enter'
    ],
    expected: 'The promo input displays "Code is invalid or expired" in red text.',
    actual: 'The entire page crashes with a 500 Internal Server Error dialog.',
    screenshots: [
      { name: 'cart-promo-input.png' },
      { name: '500-error-screen.png' }
    ]
  };

  const md = generateBugPackMarkdown(bugData);

  // Check H1 title
  assert.ok(md.startsWith('# Checkout 500 error when applying invalid promo code'), 'Title must be H1');

  // Check Environment section
  assert.ok(md.includes('## Environment'), 'Must include ## Environment');
  assert.ok(md.includes('**Staging URL:** https://staging.acme.shop/checkout'));
  assert.ok(md.includes('**Browser:** Chrome 128.0.6613.85'));
  assert.ok(md.includes('**Operating System:** macOS Sonoma 14.6.1'));
  assert.ok(md.includes('**Test Account Notes:** Role: Admin, Workspace: US-East-Staging'));

  // Check Steps to Reproduce
  assert.ok(md.includes('## Steps to Reproduce'), 'Must include ## Steps to Reproduce');
  assert.ok(md.includes('1. Open the cart page with 1 item'));
  assert.ok(md.includes('2. Click on "Enter promo code"'));
  assert.ok(md.includes('3. Type "DISCOUNT99" and hit Enter'));

  // Check Expected Behavior
  assert.ok(md.includes('## Expected Behavior'), 'Must include ## Expected Behavior');
  assert.ok(md.includes('The promo input displays "Code is invalid or expired" in red text.'));

  // Check Actual Behavior
  assert.ok(md.includes('## Actual Behavior'), 'Must include ## Actual Behavior');
  assert.ok(md.includes('The entire page crashes with a 500 Internal Server Error dialog.'));

  // Check Screenshots & Evidence
  assert.ok(md.includes('## Screenshots & Evidence'), 'Must include ## Screenshots & Evidence');
  assert.ok(md.includes('- `cart-promo-input.png`'), 'Must list filenames');
  assert.ok(md.includes('- `500-error-screen.png`'), 'Must list filenames');
  assert.ok(md.includes('![screenshot-1](cart-promo-input.png)'), 'Must include placeholder for screenshot 1');
  assert.ok(md.includes('![screenshot-2](500-error-screen.png)'), 'Must include placeholder for screenshot 2');

  // Check Footer Note
  assert.ok(md.includes('Generated by staging-bug-pack'), 'Must include footer note');

  // Optional notes omitted when empty
  assert.ok(!md.includes('## Console Notes'), 'Empty console notes must be omitted');
  assert.ok(!md.includes('## Network Notes'), 'Empty network notes must be omitted');

  console.log('✓ Test 5 Passed: Markdown structure strictly fulfills all spec requirements');
}

// Test 6: Markdown with optional fields missing
{
  const bugData = {
    title: 'Profile avatar upload fails silently',
    browser: 'Firefox 129',
    os: 'Ubuntu 24.04',
    steps: ['Upload 2MB PNG image'],
    expected: 'Avatar updates with green checkmark',
    actual: 'Spinner spins forever',
    screenshots: []
  };

  const md = generateBugPackMarkdown(bugData);
  assert.ok(md.includes('# Profile avatar upload fails silently'));
  assert.ok(md.includes('*No screenshots attached.*'));
  assert.ok(md.includes('Generated by staging-bug-pack'));
  assert.ok(!md.includes('## Console Notes'));
  assert.ok(!md.includes('## Network Notes'));
  console.log('✓ Test 6 Passed: Markdown generation with empty screenshots and optional fields');
}

// Test 7: Optional Console / Network notes appear only when filled
{
  const withNotes = generateBugPackMarkdown({
    title: 'API timeout on search',
    browser: 'Chrome 128',
    os: 'Windows 11',
    steps: ['Type query'],
    expected: 'Results render',
    actual: 'Spinner forever',
    consoleNotes: 'Uncaught TypeError: fetch failed',
    networkNotes: 'GET /api/search → 504 Gateway Timeout'
  });

  assert.ok(withNotes.includes('## Console Notes'), 'Filled console notes must appear');
  assert.ok(withNotes.includes('Uncaught TypeError: fetch failed'));
  assert.ok(withNotes.includes('## Network Notes'), 'Filled network notes must appear');
  assert.ok(withNotes.includes('GET /api/search → 504 Gateway Timeout'));

  // Placement: after Actual, before Screenshots
  const actualIdx = withNotes.indexOf('## Actual Behavior');
  const consoleIdx = withNotes.indexOf('## Console Notes');
  const networkIdx = withNotes.indexOf('## Network Notes');
  const shotsIdx = withNotes.indexOf('## Screenshots & Evidence');
  assert.ok(actualIdx < consoleIdx && consoleIdx < networkIdx && networkIdx < shotsIdx,
    'Notes sections must sit between Actual and Screenshots');

  const whitespaceOnly = generateBugPackMarkdown({
    title: 'Whitespace notes ignored',
    browser: 'Chrome',
    os: 'macOS',
    steps: ['Step'],
    expected: 'Ok',
    actual: 'Bad',
    consoleNotes: '   ',
    networkNotes: '\n\t'
  });
  assert.ok(!whitespaceOnly.includes('## Console Notes'));
  assert.ok(!whitespaceOnly.includes('## Network Notes'));

  console.log('✓ Test 7 Passed: Console/Network notes included when filled, omitted when empty');
}

// Test 8: GitHub URL length helper decides short-body fallback
{
  assert.strictEqual(typeof GITHUB_NEW_ISSUE_URL_MAX, 'number');
  assert.ok(GITHUB_NEW_ISSUE_URL_MAX >= 6000 && GITHUB_NEW_ISSUE_URL_MAX <= 8000);

  const shortUrl = buildGithubNewIssueUrl('acme/web', 'Short title', 'Short body');
  assert.ok(shortUrl.startsWith('https://github.com/acme/web/issues/new?'));
  assert.ok(shortUrl.includes('title='));
  assert.ok(shortUrl.includes('body='));
  assert.strictEqual(isGithubIssueUrlTooLong(shortUrl), false);

  const longBody = 'x'.repeat(9000);
  const planShort = planGithubIssueOpen('acme/web', 'Long pack title', longBody);
  assert.strictEqual(planShort.usedShortBody, true);
  assert.strictEqual(planShort.copyFullMarkdown, true);
  assert.ok(planShort.body.includes('Pack too long for URL'));
  assert.ok(planShort.url.length <= GITHUB_NEW_ISSUE_URL_MAX ||
    !isGithubIssueUrlTooLong(planShort.url) ||
    planShort.url.length < buildGithubNewIssueUrl('acme/web', 'Long pack title', longBody).length);

  const planFull = planGithubIssueOpen('acme/web', 'Tiny', 'ok');
  assert.strictEqual(planFull.usedShortBody, false);
  assert.strictEqual(planFull.copyFullMarkdown, false);
  assert.strictEqual(planFull.body, 'ok');

  assert.strictEqual(isGithubIssueUrlTooLong(GITHUB_NEW_ISSUE_URL_MAX + 1), true);
  assert.strictEqual(isGithubIssueUrlTooLong(GITHUB_NEW_ISSUE_URL_MAX), false);

  console.log('✓ Test 8 Passed: GitHub URL length helper selects short-body fallback correctly');
}

console.log('\nALL 8 TEST SUITES PASSED SUCCESSFULLY!');
