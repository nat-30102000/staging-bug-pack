(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BugPackValidator = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Validates the bug pack form data.
   *
   * @param {Object} data
   * @param {string} data.title
   * @param {string} [data.stagingUrl]
   * @param {string} data.browser
   * @param {string} data.os
   * @param {string} [data.testAccountNotes]
   * @param {Array<string>} data.steps
   * @param {string} data.expected
   * @param {string} data.actual
   * @param {Array<Object|File>} [data.screenshots]
   * @returns {Object} { isValid: boolean, errors: Object, summary: string[] }
   */
  function validateBugPack(data) {
    var errors = {};
    var summary = [];

    data = data || {};

    // 1. Title validation
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      errors.title = 'Title is required.';
      summary.push('Title is required');
    }

    // 2. Browser validation
    if (!data.browser || typeof data.browser !== 'string' || data.browser.trim() === '') {
      errors.browser = 'Browser is required.';
      summary.push('Browser is required');
    }

    // 3. OS validation
    if (!data.os || typeof data.os !== 'string' || data.os.trim() === '') {
      errors.os = 'Operating system is required.';
      summary.push('Operating system is required');
    }

    // 4. Steps to reproduce validation: dynamic list, at least one non-empty step required
    var rawSteps = Array.isArray(data.steps) ? data.steps : [];
    var nonEmptySteps = rawSteps.filter(function (s) {
      return typeof s === 'string' && s.trim().length > 0;
    });

    if (nonEmptySteps.length === 0) {
      errors.steps = 'At least one non-empty step to reproduce is required.';
      summary.push('At least one non-empty step is required');
    }

    // 5. Expected behavior validation
    if (!data.expected || typeof data.expected !== 'string' || data.expected.trim() === '') {
      errors.expected = 'Expected behavior is required.';
      summary.push('Expected behavior is required');
    }

    // 6. Actual behavior validation
    if (!data.actual || typeof data.actual !== 'string' || data.actual.trim() === '') {
      errors.actual = 'Actual behavior is required.';
      summary.push('Actual behavior is required');
    }

    // 7. Screenshots limit validation (0 to 5 allowed)
    if (data.screenshots && Array.isArray(data.screenshots)) {
      if (data.screenshots.length > 5) {
        errors.screenshots = 'Maximum of 5 screenshots allowed (found ' + data.screenshots.length + ').';
        summary.push('Maximum 5 screenshots allowed');
      }
    }

    var isValid = Object.keys(errors).length === 0;

    return {
      isValid: isValid,
      errors: errors,
      summary: summary
    };
  }

  return {
    validateBugPack: validateBugPack
  };
});
