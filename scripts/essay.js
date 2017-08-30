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
  }

  // Extends Question
  Essay.prototype = Object.create(Question.prototype);
  Essay.prototype.constructor = Essay;

  /**
   * Register the DOM elements with H5P.Question.
   */
  Essay.prototype.registerDomElements = function() {
    var that = this;

    // Get previous state
    if (this.contentData !== undefined && this.contentData.previousState !== undefined) {
      that.previousState = this.contentData.previousState;
    }
    var oldText = (that.previousState !== undefined) ? that.previousState.text || '' : '';

    /*
     * This is a little ugly for several reasons. First of all, it would be
     * nicer if H5P.TextInputField had a function to return the HTML for
     * introduction and content. However, this way we don't have to touch that
     * code right now. Secondly, we use jQuery. H5P is going to ditch it, but
     * we can use the existing attach method.
     * TODO: Get rid of jQuery and change H5P.TextInputField as soon as the
     *       H5P core runs without jQuery.
     */
    var $wrapperInputfield = $('<div>');
    that.inputField = new H5P.TextInputField(this.config.inputField.params,
      this.contentId, {
        'standalone': true,
        'previousState': oldText
      });
    that.inputField.attach($wrapperInputfield);

    // Register task introduction text
    that.setIntroduction($wrapperInputfield.children().get(0));

    // Register content
    that.setContent($wrapperInputfield.get(0));

    // Register Buttons
    this.addButtons();
  };

  /**
   * Add all the buttons that shall be passed to H5P.Question
   */
  Essay.prototype.addButtons = function () {
    var that = this;

    // Check answer button
    that.addButton('check-answer', that.config.checkAnswer, function () {
      that.showEvaluation();
    }, true, {}, {});
  };

  /**
   * Show results.
   */
  Essay.prototype.showEvaluation = function () {
    var that = this;
    //that.hideButton('check-answer');
    this.setFeedback(
      that.config.feedbackDefault,
      that.computeScore(),
      that.config.keywordGroups.length);
  };

  /**
   * Compute the score.
   * @return {number} Score.
   */
  Essay.prototype.computeScore = function() {
    var that = this;

    var result = 0;

    // We don't want EOLs to mess up the string.
    var input = this.inputField.getInput().value
      .replace(/(\r\n|\r|\n)/g, ' ')
      .replace(/\s\s/g, ' ');

    // Check for case sensitivity
    if (this.config.behaviour !== true) {
      input = input.toLowerCase();
    }

    // Should not happen, but just to be sure ...
    this.config.keywordGroups = this.config.keywordGroups || [];

    /*
     * If you don't want to only find exact matches of keywords, but also
     * close resemblences or phrases, things get more complicated then you
     * might expect. This could probably be improved.
     */

    // Within each keyword group check if one of the alternatioves is a keyword
    this.config.keywordGroups.forEach(function (alternatives) {
      alternatives.some(function (alternative) {
        // Check for case sensitivity
        if  (that.config.behaviour !== true) {
          alternative = alternative.toLowerCase();
        }

        /*
         * TODO: Fuzzy search would be cool, but might be tricky to do smart
         *       because we don't compare a word with a word but need to look
         *       if a word or a similar (!) word is within a text.
         *       Naive approach: move a window of word's length over the text
         *       and compare with a fuzzy string metric - might be very slow.
         */
        if (input.indexOf(alternative) !== -1 && H5P.TextUtilities.isIsolated(alternative, input)) {
          result++;
          return true;
        }
      });
    });

    return result;
  };

  /**
   * Store the current content content state
   * @return {object} current content state
   */
  Essay.prototype.getCurrentState = function () {
    // Collect data from TextInputField (we might need more later)
    var textInputField = '';
    if (this.inputField.getCurrentState instanceof Function || typeof this.inputField.getCurrentState === 'function') {
      textInputField = this.inputField.getCurrentState();
    }
    return {
      'text': textInputField
    };
  };

  return Essay;
}(H5P.jQuery, H5P.Question);
