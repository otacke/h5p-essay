var H5P = H5P || {};

H5P.Essay = function ($, Question) {
  'use strict';
  /**
   * @constructor
   *
   * @param {Object} config - Config from semantics.json.
   * @param {string} contentId - ContentId.
   * @param {Object} contentData - contentData.
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

    // map function
    var toPoints = function (keywordGroup) {
      return keywordGroup.options && keywordGroup.options.points || 0;
    };

    // reduce function
    var sum = function (a, b) {
      return a + b;
    };

    // scoreMax = Maximum number of points available by all keyword groups
    var scoreMax = this.config.keywordGroups
      .map(toPoints)
      .reduce(sum, 0);

    // scoreMastering: score indicating mastery and maximum number on progress bar (can be < scoreMax)
    this.scoreMastering = (typeof this.config.behaviour.percentageMastering === 'undefined') ?
        scoreMax :
        this.config.behaviour.percentageMastering * scoreMax / 100;

    // scorePassing: score to pass the task (<= scoreMastering)
    this.scorePassing = Math.min(this.scoreMastering, this.config.behaviour.percentagePassing * scoreMax / 100 || 0);
  }

  // Extends Question
  Essay.prototype = Object.create(Question.prototype);
  Essay.prototype.constructor = Essay;

  /**
   * Register the DOM elements with H5P.Question.
   */
  Essay.prototype.registerDomElements = function () {
    // Get previous state
    if (!!this.contentData && !!this.contentData.previousState) {
      this.previousState = this.contentData.previousState;
    }
    var oldText = (!!this.previousState) ? this.previousState.text || '' : '';

    /*
     * TODO: Get rid of jQuery and change H5P.EssayInputField as soon as the
     *       H5P core runs without jQuery.
     */
    var $wrapperInputfield = $('<div>');
    this.inputField = new H5P.EssayInputField(this.config.inputField.params,
      this.contentId, {
        'standalone': true,
        'previousState': oldText
      });
    this.inputField.attach($wrapperInputfield);

    // Register task introduction text
    this.setIntroduction(this.inputField.getIntroduction());

    // Register content
    this.$solution = this.getSolution(false);
    var $content = $('<div>')
        .append(this.inputField.getContent())
        .append(this.$solution);
    this.setContent($content);

    // Register Buttons
    this.addButtons();
  };

  /**
   * Add all the buttons that shall be passed to H5P.Question
   */
  Essay.prototype.addButtons = function () {
    var that = this;

    // Show solution button
    that.addButton('show-solution', that.config.showSolution, function () {
      that.showSolution();
    }, false, {}, {});

    // Check answer button
    that.addButton('check-answer', that.config.checkAnswer, function () {
      that.showEvaluation();
    }, true, {}, {});

    // Retry button
    that.addButton('try-again', that.config.tryAgain, function () {
      that.showEvaluation();
    }, false, {}, {});
  };

  /**
   * Get the solution block.
   * @return {jQuery} Solution block.
   */
  Essay.prototype.getSolution = function (visible) {
    var $solution = $('<div>').addClass('h5p-essay-solution');
    $solution.append($('<div>')
        .addClass('h5p-essay-solution-title')
        .html(this.config.solutionTitle));
    $solution.append($('<div>')
        .addClass('h5p-essay-solution-introduction'));
    $solution.append($('<div>')
        .addClass('h5p-essay-solution-sample'));
    if (!visible) {
      $solution.addClass('h5p-essay-hidden');
    }
    return $solution;
  };

  /**
   * Show solution.
   */
  Essay.prototype.showSolution = function () {
    this.$solution.removeClass('h5p-essay-hidden');
    // We'll insert the text here to make cheating a little harder at least ...
    this.$solution
        .find('.h5p-essay-solution-introduction')
        .html(this.config.solution.introduction);
    this.$solution
        .find('.h5p-essay-solution-sample')
        .html(this.config.solution.sample);
    this.trigger('resize');
  };

  /**
   * Show results.
   */
  Essay.prototype.showEvaluation = function () {
    var feedback = this.computeResults();

    // map function
    var toMessages = function (text) {
      return text.message;
    };

    // reduce function
    var combine = function (a, b) {
      return a.trim() + ' ' + b.trim();
    };

    // TODO: This could possibly be made nicer visually if we use the info about found/missing using a filter
    var feedbackMessage = feedback.text
       .map(toMessages)
       .reduce(combine, '');
    feedbackMessage = (feedbackMessage !== '') ?
      feedbackMessage = feedbackMessage + '<br />' :
      feedbackMessage;

    // Not all keyword groups might be necessary for mastering
    var score = Math.min(feedback.score, this.scoreMastering);

    var textScore = H5P.Question.determineOverallFeedback(
        this.config.overallFeedback, score / this.scoreMastering)
            .replace('@score', score)
            .replace('@total', this.scoreMastering);

    this.setFeedback(
        feedbackMessage + textScore,
        score,
        this.scoreMastering);

    this.hideButton('check-answer');
    this.trigger(this.createEssayXAPIEvent('completed'));

    var xAPIEvent = this.createEssayXAPIEvent('scored');
    xAPIEvent.setScoredResult(score, this.scoreMastering, this, true,
        feedback.score >= this.scorePassing);
    xAPIEvent.data.statement.result.response = this.getInput();
    /*
     * We could think about adding support for the "correct response pattern",
     * but the official xAPI documentation discourages to use it if the
     * criteria for a question are complex and correct responses cannot be
     * exhaustively listed. They kind of can and can't.
     */
    this.trigger(xAPIEvent);

    if (feedback.score < this.scorePassing) {
      this.trigger(this.createEssayXAPIEvent('failed'));
    }
    else {
      this.trigger(this.createEssayXAPIEvent('passed'));
    }

    if (this.config.solution.sample) {
      this.showButton('show-solution');
    }

    if (score < this.scoreMastering) {
      if (this.config.behaviour.enableRetry) {
        this.showButton('try-again');
      }
    }
    else {
      this.trigger(this.createEssayXAPIEvent('mastered'));
      this.hideButton('try-again');
    }

    this.trigger('resize');
  };

  /**
   * Compute the feedback.
   * @return {Object} Feedback of {score: number, text: [{message: String, found: boolean}]}.
   */
  Essay.prototype.computeResults = function () {
    var that = this;
    var score = 0;
    var text = [];

    // We don't want EOLs to mess up the string.
    var input = this.getInput();
    var inputLowerCase = input.toLowerCase();

    // Should not happen, but just to be sure ...
    this.config.keywordGroups = this.config.keywordGroups || [];

    /*
     * If you don't want to only find exact matches of keywords, but also
     * close resemblences or phrases, things get more complicated then you
     * might expect. This could probably be improved.
     */

    // Within each keyword group check if one of the alternatives is a keyword
    this.config.keywordGroups.forEach(function (alternativeGroup) {
      var found = alternativeGroup.alternatives.some(function (candidate) {
        var alternative = candidate.alternative;
        var options = candidate.options;

        var inputTest = input;

        // Check for case sensitivity
        if  (!options.caseSensitive ||
            that.config.behaviour.overrideCaseSensitive === 'off') {
              alternative = alternative.toLowerCase();
              inputTest = inputLowerCase;
        }

        // Exact matching
        if (inputTest.indexOf(alternative) !== -1 && H5P.TextUtilities.isIsolated(alternative, inputTest)) {
          return true;
        }

        // Wildcard matching
        var regex = new RegExp(alternative.replace(/\*/g, '[A-z]*'), 'g');
        var found = (inputTest.match(regex) || []).some(function (match) {
          if (regex.test(inputTest) && H5P.TextUtilities.isIsolated(match, inputTest)) {
            return true;
          }
        });
        if (found) {
          return true;
        }

        // Fuzzy matching
        if ((options.forgiveMistakes || that.config.behaviour.overrideForgiveMistakes === 'on') &&
            H5P.TextUtilities.fuzzyContains(alternative, inputTest)) {
          return true;
        }
      });

      if (found) {
        score += alternativeGroup.options.points;
        if (alternativeGroup.options.feedbackFound) {
          text.push({"message": alternativeGroup.options.feedbackFound, "found": true});
        }
      }
      else {
        if (alternativeGroup.options.feedbackMissed) {
          text.push({"message": alternativeGroup.options.feedbackMissed, "found": false});
        }
      }
    });

    return {"score": score, "text": text};
  };

  /**
   * Store the current content content state
   * @return {Object} current content state
   */
  Essay.prototype.getCurrentState = function () {
    // Collect data from TextInputField (we might need more later)
    var essayInputField = '';
    if (this.inputField.getCurrentState instanceof Function ||
        typeof this.inputField.getCurrentState === 'function') {
      essayInputField = this.inputField.getCurrentState();
    }
    return {
      'text': essayInputField
    };
  };

  /**
   * Get the user input from DOM.
   * @return {string} Cleaned input.
   */
  Essay.prototype.getInput = function () {
    return this.inputField.getInput().value
        .replace(/(\r\n|\r|\n)/g, ' ')
        .replace(/\s\s/g, ' ');
  };

  /**
   * Extend an array just like JQuery's extend.
   * @param {Object} arguments - Objects to be merged.
   * @return {Object} Merged objects.
   */
  Essay.prototype.extend = function () {
    for(var i = 1; i < arguments.length; i++) {
      for(var key in arguments[i]) {
        if (arguments[i].hasOwnProperty(key)) {
          if (typeof arguments[0][key] === 'object' && typeof arguments[i][key] === 'object') {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  };

  /**
   * Create an xAPI event for Essay.
   * @param {string} verb - Short id of the verb we want to trigger.
   * @return {H5P.XAPIEvent} Event template.
   */
  Essay.prototype.createEssayXAPIEvent = function (verb) {
    var xAPIEvent = this.createXAPIEventTemplate(verb);
    this.extend(
        xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
        this.getxAPIDefinition());
    return xAPIEvent;
  };

  /**
   * Get the xAPI definition for the xAPI object.
   * return {Object} XAPI definition.
   */
  Essay.prototype.getxAPIDefinition = function () {
    var definition = {};
    definition.name = {'en-US': 'Essay'};
    definition.description = {'en-US': this.config.inputField.params.taskDescription};
    definition.type = 'http://id.tincanapi.com/activitytype/essay';
    definition.interactionType = 'long-fill-in';
    return definition;
  };

  return Essay;
}(H5P.jQuery, H5P.Question);
