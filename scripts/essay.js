var H5P = H5P || {};

H5P.Essay = function ($) {
  'use strict';
  /**
   * @constructor
   *
   * @param {object} config - Config from semantics.json.
   * @param {string} contentId - ContentId.
   * @param {object} contentData - contentData.
   */
  function Essay(config, contentId, contentData) {
    // Initialize
    if (!config) {
      return;
    }
    this.config = config;
    this.contentData = contentData || {};

    // Create DOM
    this.element = document.createElement('div');
    this.element.innerText = 'foo';

    /**
     * Attach function called by H5P framework to insert H5P content into page.
     * TODO: Remove this jQuery dependency as soon as the H5P framework is ready
     *
     * @param {jQuery} $wrapper - Container to attach to.
     */
    this.attach = function($wrapper) {
      $wrapper.get(0).classList.add('h5p-essay');
      $wrapper.get(0).appendChild(this.element);
    };

    // Initialize event inheritance
    H5P.EventDispatcher.call(this);
  }

  // Extends the event dispatcher
  Essay.prototype = Object.create(H5P.EventDispatcher.prototype);
  Essay.prototype.constructor = Essay;

  return Essay;
}(H5P.jQuery);
