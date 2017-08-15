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
      var that = this;
      $wrapper.get(0).classList.add('h5p-essay');

    // Title
    if (that.config.title) {
      var title = document.createElement('div');
      title.classList.add('h5p-essay-title');
      title.innerHTML = '<h2>' + that.config.title + '</h2>';
      $wrapper.get(0).appendChild(title);
    }

    // Task
    if (that.config.task) {
      var task = document.createElement('div');
      task.classList.add('h5p-essay-task');
      task.setAttribute('tabindex', 0);
      task.innerHTML = that.config.task;
      $wrapper.get(0).appendChild(task);
    }

    // Text Area
    // TODO: Check if we can easily use and modify h5p-text-input-field
    this.text = document.createElement('textarea');
    this.text.classList.add('h5p-essay-text');
    this.text.setAttribute('tabindex', 0);
    this.text.setAttribute('required', '');
    this.text.setAttribute('rows', 10);
    //this.text.innerHTML = 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet.';
    $wrapper.get(0).appendChild(this.text);

    // Check-Button
    // TODO: Check how the Check-Button + Score Bar is used in H5P contents
    this.buttonCheck = document.createElement('button');
    this.buttonCheck.innerHTML = 'CHECK';
    this.buttonCheck.addEventListener('click', function() {
      console.log(that.computeScore());
    });
    $wrapper.get(0).appendChild(this.buttonCheck);

    that.trigger('resize');
  };

    // Initialize event inheritance
    H5P.EventDispatcher.call(this);
  }

  // Extends the event dispatcher
  Essay.prototype = Object.create(H5P.EventDispatcher.prototype);
  Essay.prototype.constructor = Essay;

  Essay.prototype = {
    computeScore: function() {
      var result = 0;
      // Remove everything but characters, numbers and spaces
      // TODO: Think if leaving - might be advisable
      var words = this.text.value.replace(/[^A-Za-z0-9\s]/g,'').split(' ');
      for (var i = 0; i < this.config.keywords.length; i++) {
        if (words.indexOf(this.config.keywords[i]) !== -1) {
          result++;
        }
      }
      return result;
    }
  };

  return Essay;
}(H5P.jQuery);
