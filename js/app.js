/**
 * staging-bug-pack: Main Application Logic
 * Pure client-side, zero dependencies
 */

(function () {
  'use strict';

  // State
  var state = {
    title: '',
    stagingUrl: '',
    browser: '',
    os: '',
    testAccountNotes: '',
    steps: [''],
    expected: '',
    actual: '',
    screenshots: [],
    touched: {},
    activePreviewTab: 'raw'
  };

  console.log('staging-bug-pack app bootstrap');
})();
