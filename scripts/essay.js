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

    this.config.behaviour.minimumLength = this.config.behaviour.minimumLength || 0;
    if (this.config.behaviour.maximumLength !== undefined) {
      this.config.behaviour.minimumLength = Math.min(this.config.behaviour.minimumLength, this.config.behaviour.maximumLength);
    }

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

    this.solution = this.buildSolution();
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
      // Show message if the minimum number of characters has not been met
      if (that.inputField.getText().length < that.config.behaviour.minimumLength) {
        that.inputField.setMessageChars(that.config.notEnoughChars.replace(/@chars/g, that.config.behaviour.minimumLength));
        return;
      }

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
   * @return {object} DOM object.
   */
  Essay.prototype.buildSolution = function () {
    var solution = document.createElement('div');
    solution.classList.add('h5p-essay-solution-container');
    solution.setAttribute('tabindex', '0');

    var solutionTitle = document.createElement('div');
    solutionTitle.classList.add('h5p-essay-solution-title');
    solutionTitle.innerHTML = this.config.solutionTitle;
    solution.append(solutionTitle);

    var solutionIntroduction = document.createElement('div');
    solutionIntroduction.classList.add('h5p-essay-solution-introduction');
    solutionIntroduction.innerHTML = this.config.solution.introduction;
    solution.append(solutionIntroduction);

    var solutionSample = document.createElement('div');
    solutionSample.classList.add('h5p-essay-solution-sample');
    solution.append(solutionSample);

    return solution;
  };

  /**
   * Show solution.
   */
  Essay.prototype.showSolution = function () {
    // We add the sample solution here to make cheating at least a little more difficult
    var text = document.createElement('div');
    text.classList.add('h5p-essay-solution-sample-text');
    text.innerHTML = this.config.solution.sample;
    this.solution.children[2].append(text);

    // Insert solution after explanations
    var explanation = document.getElementsByClassName('h5p-question-explanation')[0];
    explanation.parentNode.insertBefore(this.solution, explanation.nextSibling);

    this.solution.focus();
    this.trigger('resize');
  };

  /**
   * Hide the solution.
   */
  Essay.prototype.hideSolution = function () {
    this.solution.remove();
  };

  /**
   * Show results.
   */
  Essay.prototype.showEvaluation = function () {
    var feedback = this.computeResults();

    // Build explanations
    var explanations = this.buildExplanation(feedback);

    if (explanations.length > 0) {
      this.setExplanation(explanations, this.config.feedbackHeader);
    }
    else {
      this.setExplanation([], '');
      // We don't need this DOM element if there are no explanations
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

    // Show and hide buttons as necessary
    this.handleButtons (score);

    // Trigger xAPI statements as necessary
    this.handleXAPI(score);

    this.trigger('resize');
  };

  /**
   * Build explanations from feedback.
   * @param {object} feedback - Feedback received.
   * @param {object} feedback.explanation Array of explanation items for feedback.
   * @param {boolean} feedback.explanation.found - True if the keyword was found.
   * @param {string} feedback.explanation.keyword - Keyword that was found/not found.
   * @param {string} feedback.explanation.message - Message for the keyword.
   * @return {object} Array of explanations.
   */
  Essay.prototype.buildExplanation = function (feedback) {
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
    }
    return explanations;
  };

  /**
   * Handle buttons' visibility
   * @param {number} score - Score the user received.
   */
  Essay.prototype.handleButtons = function (score) {
    if (this.config.solution.sample && !this.solution) {
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
  };

  /**
   * Handle xAPI event triggering
   * @param {number} score - Score the user received.
   */
  Essay.prototype.handleXAPI = function (score) {
    this.trigger(this.createEssayXAPIEvent('completed'));

    var xAPIEvent = this.createEssayXAPIEvent('scored');
    xAPIEvent.setScoredResult(score, this.scoreMastering, this, true,
        score >= this.scorePassing);
    xAPIEvent.data.statement.result.response = this.getInput();
    /*
     * We could think about adding support for the "correct response pattern",
     * but the official xAPI documentation discourages to use it if the
     * criteria for a question are complex and correct responses cannot be
     * exhaustively listed. They kind of can and can't.
     */
    this.trigger(xAPIEvent);

    if (score < this.scorePassing) {
      this.trigger(this.createEssayXAPIEvent('failed'));
    }
    else {
      this.trigger(this.createEssayXAPIEvent('passed'));
    }
    if (score >= this.scoreMastering) {
      this.trigger(this.createEssayXAPIEvent('mastered'));
    }
  };

  /**
   * Compute the feedback.
   * @return {Object} Feedback of {score: number, text: [{message: String, found: boolean}]}.
   */
  Essay.prototype.computeResults = function () {
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
            keywordFound = match;
            return true;
          }
        });
        if (found) {
          return true;
        }

        // Fuzzy matching
        var fuzzyFound = H5P.TextUtilities.fuzzyFind(alternative, inputTest);
        if ((options.forgiveMistakes || that.config.behaviour.overrideForgiveMistakes === 'on') &&
            fuzzyFound.contains) {
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
