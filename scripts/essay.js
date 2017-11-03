var H5P = H5P || {};

/*
 * TODO: Add optional media on top (possibly => Could also be done using column)
 * TODO: Add minimum characters
 * TODO: Use Range instead of two numbers
 * TODO: Check areSimilar for errors (with/without case sensitivity)
 */

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
    var toPoints = function (keywords) {
      return keywords.options && keywords.options.points || 0;
    };

    // reduce function
    var sum = function (a, b) {
      return a + b;
    };

    // scoreMax = Maximum number of points available by all keyword groups
    var scoreMax = this.config.keywords
      .map(toPoints)
      .reduce(sum, 0);

    // scoreMastering: score indicating mastery and maximum number on progress bar (can be < scoreMax)
    this.scoreMastering = (typeof this.config.behaviour.percentageMastering === 'undefined') ?
        scoreMax :
        this.config.behaviour.percentageMastering * scoreMax / 100;

    // scorePassing: score to pass the task (<= scoreMastering)
    this.scorePassing = Math.min(
          this.scoreMastering,
          this.config.behaviour.percentagePassing * scoreMax / 100 || 0);

    this.$solution = this.buildSolution();
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

    // Create InputField
    this.inputField = new H5P.Essay.InputField({
      'taskDescription': this.config.taskDescription,
      'placeholderText': this.config.placeholderText,
      'maximumLength': this.config.behaviour.maximumLength,
      'remainingChars': this.config.remainingChars,
      'inputFieldSize': this.config.behaviour.inputFieldSize
    }, this.previousState);

    // Register task introduction text
    this.setIntroduction(this.inputField.getIntroduction());

    // Register content
    this.setContent(this.inputField.getContent());

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
      that.hideButton('show-solution');
    }, false, {}, {});

    // Check answer button
    that.addButton('check-answer', that.config.checkAnswer, function () {
      that.inputField.disable();
      that.showEvaluation();
      if (that.config.solution.sample !== undefined && that.config.solution.sample !== '') {
        that.showButton('show-solution');
      }
      that.hideButton('check-answer');
    }, true, {}, {});

    // Retry button
    that.addButton('try-again', that.config.tryAgain, function () {
      that.setExplanation();
      that.removeFeedback();
      that.hideSolution();

      that.hideButton('show-solution');
      that.hideButton('try-again');
      that.showButton('check-answer');

      that.inputField.enable();
    }, false, {}, {});
  };

  /**
   * Build solution DOM object.
   * @return {jQuery} DOM object.
   */
  Essay.prototype.buildSolution = function () {
    return $('<div>')
        .addClass('h5p-essay-solution-container')
        .attr('tabIndex', '0')
        .append($('<div>')
            .addClass('h5p-essay-solution-title')
            .html(this.config.solutionTitle))
        .append($('<div>')
            .addClass('h5p-essay-solution-introduction')
            .html(this.config.solution.introduction))
        .append($('<div>')
            .addClass('h5p-essay-solution-sample'));
  };

  /**
   * Show solution.
   */
  Essay.prototype.showSolution = function () {
    // TODO: Clean up here
    var text = document.createElement('div');
    text.classList.add('h5p-essay-solution-sample-text');
    text.innerHTML = this.config.solution.sample;
    this.$solution.find('.h5p-essay-solution-sample')
        .append(text);
    this.$solution.insertAfter('.h5p-question-explanation');

    this.trigger('resize');
    this.$solution.focus();
  };

  /**
   * Hide the solution.
   */
  Essay.prototype.hideSolution = function () {
    this.$solution.remove();
  };

  /**
   * Show results.
   */
  Essay.prototype.showEvaluation = function () {
    var feedback = this.computeResults();

    // Add explanations if available
    const emptyWord = '<span class="h5p-essay-feedback-empty">...</span>';

    var explanations = [];
    feedback.explanation.forEach(function (element) {
      if (element.found) {
        explanations.push({correct: element.keyword, text: element.message});
      }
      else {
        explanations.push({correct: emptyWord, text: element.message});
      }
    });

    if (explanations.length > 0) {
      // Included before not included, but keep order otherwise
      explanations.sort(function (a, b) {
        return a.correct === emptyWord && b.correct !== emptyWord;
      });
      this.setExplanation(explanations, this.config.feedbackHeader);
    }
    else {
      this.setExplanation([], '');
      var explanationContainer = document.getElementsByClassName('h5p-question-explanation-container')[0];
      explanationContainer.remove();
    }

    // Not all keyword groups might be necessary for mastering
    var score = Math.min(feedback.score, this.scoreMastering);

    var textScore = H5P.Question.determineOverallFeedback(
        this.config.overallFeedback, score / this.scoreMastering)
            .replace('@score', score)
            .replace('@total', this.scoreMastering);

    this.setFeedback(textScore, score, this.scoreMastering);


    // TODO: Move this out of this function!!!
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

    if (this.config.solution.sample && !this.$solution) {
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
    // TODO: This could be cleaned up, e.g. don't use some for returning true but something else returning undefined || keywordFound
    var that = this;
    var score = 0;
    var explanation = [];

    // We don't want EOLs to mess up the string.
    var input = this.getInput();
    var inputLowerCase = input.toLowerCase();

    // Should not happen, but just to be sure ...
    this.config.keywords = this.config.keywords || [];

    // optional = false is ignored in Editor
    this.config.keywords = this.config.keywords.filter(function (element) {
      return (typeof element.keyword !== 'undefined');
    });

    /*
     * If you don't want to only find exact matches of keywords, but also
     * close resemblences or phrases, things get more complicated then you
     * might expect. This could probably be improved.
     */

    // Within each keyword group check if one of the alternatives is a keyword
    this.config.keywords.forEach(function (alternativeGroup) {
      var options = alternativeGroup.options;
      var alternatives = [alternativeGroup.keyword || []].concat(alternativeGroup.alternatives || []);

      var keywordFound = '';
      var found = alternatives.some(function (alternative) {
        var inputTest = input;
        var alternativeOriginal = alternative;

        // Check for case sensitivity
        if  (!options.caseSensitive ||
            that.config.behaviour.overrideCaseSensitive === 'off') {
              alternative = alternative.toLowerCase();
              inputTest = inputLowerCase;
        }

        // Exact matching
        if (inputTest.indexOf(alternative) !== -1 && H5P.TextUtilities.isIsolated(alternative, inputTest)) {
          keywordFound = alternativeOriginal;
          return true;
        }

        // Wildcard matching
        var regex = new RegExp(alternative.replace(/\*/g, '[A-z]*'), 'g');
        var found = (inputTest.match(regex) || []).some(function (match) {
          if (regex.test(inputTest) && H5P.TextUtilities.isIsolated(match, inputTest)) {
            keywordFound = alternativeOriginal;
            return true;
          }
        });
        if (found) {
          return true;
        }

        // Fuzzy matching
        if ((options.forgiveMistakes || that.config.behaviour.overrideForgiveMistakes === 'on') &&
            H5P.TextUtilities.fuzzyContains(alternative, inputTest)) {
          keywordFound = alternativeOriginal;
          return true;
        }
      });

      if (found) {
        score += options.points;
        if (options.feedbackIncluded) {
          explanation.push({
            "keyword": keywordFound,
            "message": options.feedbackIncluded,
            "found": true});
        }
      }
      else {
        if (options.feedbackMissed) {
          explanation.push({
            "keyword": alternatives.join(' | '),
            "message": options.feedbackMissed,
            "found": false});
        }
      }
    });

    return {"score": score, "explanation": explanation};
  };

  /**
   * Get the user input from DOM.
   * @return {string} Cleaned input.
   */
  Essay.prototype.getInput = function () {
    return this.inputField.getText()
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
          if (typeof arguments[0][key] === 'object' &&
              typeof arguments[i][key] === 'object') {
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
   * Get current state for H5P.Question.
   * @return {Object} Current state.
   */
  Essay.prototype.getCurrentState = function () {
    this.inputField.updateMessageSaved(this.config.messageSave);

    // We could have just used a string, but you never know when you need to store more parameters
    return {
      'inputField': this.inputField.getText()
    };
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
    definition.description = {'en-US': this.config.taskDescription};
    definition.type = 'http://id.tincanapi.com/activitytype/essay';
    definition.interactionType = 'long-fill-in';
    return definition;
  };

  return Essay;
}(H5P.jQuery, H5P.Question);
