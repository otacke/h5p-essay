var H5P = H5P || {};

H5P.Essay = function ($, Question) {
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

    // Inheritance
    Question.call(this, 'essay');

    this.config = config;
    this.contentId = contentId;
    this.contentData = contentData || {};

    // Create DOM
    this.element = document.createElement('div');
  }

  // Extends Question
  Essay.prototype = Object.create(Question.prototype);
  Essay.prototype.constructor = Essay;

  Essay.prototype = {
    computeScore: function() {
      var result = 0;
      // Remove everything but characters, numbers, - and spaces
      var words = this.inputfield.getInput().value
        .replace(/(\r\n|\r|\n)/g, ' ')
        .replace(/[^A-Za-z0-9-\s]/g,'')
        .split(' ');
      // Check keywords in groups for matches
      for (var i = 0; i < this.config.keywordGroups.length; i++) {
        var keywords = this.config.keywordGroups[i];
        for (var j = 0; j < keywords.length; j++) {
          if (words.indexOf(keywords[j]) !== -1) {
            result++;
            break;
          }
        }
      }
      return result;
    },
    registerDomElements: function() {
      var that = this;

      /*
       * This is a little ugly for several reasons. First of all, it would be
       * nicer if H5P.TextInputField had a function to return the HTML for
       * introduction and content. However, this way we don't have to touch that
       * code right now. Secondly, we use jQuery. H5P is going to ditch it, but
       * we can use the existing attach method.
       * TODO: Get rid of jQuery and change H5P.TextInputField as soon as the
       *       H5P core runs without jQuery.
       */
      var $wrapper_inputfield = $('<div>');
      that.inputfield = new H5P.TextInputField(this.config.inputfield.params, this.contentId);
      that.inputfield.attach($wrapper_inputfield);

      // Register task introduction text
      that.setIntroduction($wrapper_inputfield.children().get(0));

      // Register content
      that.setContent($wrapper_inputfield.get(0));

      // Register Buttons
      this.addButtons();
    },
    addButtons: function () {
      var that = this;

      // Check answer button
      that.addButton('check-answer', that.config.checkAnswer, function () {
        that.showEvaluation();
      }, true, {}, {});
    },
    showEvaluation: function () {
      var that = this;
      that.hideButton('check-answer');
      this.setFeedback(
        'Let us see how many of my keywords you used ...',
        that.computeScore(),
        that.config.keywordGroups.length);
    }
  };

  return Essay;
}(H5P.jQuery, H5P.Question);
