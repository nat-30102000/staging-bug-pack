const assert = require('assert');
const { validateBugPack } = require('../js/validator.js');
const { generateBugPackMarkdown } = require('../js/markdown.js');

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
  console.log('\u2713 Test 1 Passed: Empty form validation flags all required fields');
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
  console.log('\u2713 Test 2 Passed: Whitespace-only values are properly rejected');
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
  console.log('\u2713 Test 3 Passed: Steps validation requires at least 1 non-empty step');
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
  console.log('\u2713 Test 4 Passed: 0-5 screenshots limit enforced');
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

  console.log('\u2713 Test 5 Passed: Markdown structure strictly fulfills all spec requirements');
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
  console.log('\u2713 Test 6 Passed: Markdown generation with empty screenshots and optional fields');
}

console.log('\nALL 6 TEST SUITES PASSED SUCCESSFULLY!');
