var H5P = H5P || {};

H5P.Essay = function ($, Question) {
  'use strict';

  // CSS Classes
  var SOLUTION_CONTAINER = 'h5p-essay-solution-container';
  var SOLUTION_TITLE = 'h5p-essay-solution-title';
  var SOLUTION_INTRODUCTION = 'h5p-essay-solution-introduction';
  var SOLUTION_SAMPLE = 'h5p-essay-solution-sample';
  var SOLUTION_SAMPLE_TEXT = 'h5p-essay-solution-sample-text';
  var QUESTION_EXPLANATION = 'h5p-question-explanation';
  var QUESTION_CONTENT = 'h5p-question-content';

  // The H5P feedback right now only expects true (green)/false (red) feedback, not neutral feedback
  var FEEDBACK_EMPTY= '<span class="h5p-essay-feedback-empty">...</span>';

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

    // Determine the minimum number of characters that should be entered
    this.config.behaviour.minimumLength = this.config.behaviour.minimumLength || 0;
    if (this.config.behaviour.maximumLength !== undefined) {
      this.config.behaviour.minimumLength = Math.min(this.config.behaviour.minimumLength, this.config.behaviour.maximumLength);
    }

    // map function
    var toPoints = function (keywords) {
      return (keywords.options && keywords.options.points || 0) * (keywords.options.occurrences || 1);
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
    this.scoreMastering = this.config.behaviour.percentageMastering === undefined ?
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
   * Get the user input from DOM.
   * @return {string} Cleaned input.
   */
  Essay.prototype.getInput = function () {
    return this.inputField.getText().replace(/(\r\n|\r|\n)/g, ' ').replace(/\s\s/g, ' ');
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
        that.inputField.setMessageChars(that.config.notEnoughChars.replace(/@chars/g, that.config.behaviour.minimumLength), true);
        return;
      }

      that.inputField.disable();

      that.handleEvaluation();

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
      that.inputField.focus();
    }, false, {}, {});
  };

  /**
   * Build solution DOM object.
   * @return {Object} DOM object.
   */
  Essay.prototype.buildSolution = function () {
    var solution = document.createElement('div');
    solution.classList.add(SOLUTION_CONTAINER);
    solution.setAttribute('tabindex', '0');

    var solutionTitle = document.createElement('div');
    solutionTitle.classList.add(SOLUTION_TITLE);
    solutionTitle.innerHTML = this.config.solutionTitle;
    solution.appendChild(solutionTitle);

    var solutionIntroduction = document.createElement('div');
    solutionIntroduction.classList.add(SOLUTION_INTRODUCTION);
    solutionIntroduction.innerHTML = this.config.solution.introduction;
    solution.appendChild(solutionIntroduction);

    var solutionSample = document.createElement('div');
    solutionSample.classList.add(SOLUTION_SAMPLE);
    solution.appendChild(solutionSample);

    return solution;
  };

  /**
   * Show solution.
   */
  Essay.prototype.showSolution = function () {
    // We add the sample solution here to make cheating at least a little more difficult
    if (this.solution.children[2].children.length === 0) {
      var text = document.createElement('div');
      text.classList.add(SOLUTION_SAMPLE_TEXT);
      text.innerHTML = this.config.solution.sample;
      this.solution.children[2].appendChild(text);
    }

    // Insert solution after explanations or content
    var predecessor = document.getElementsByClassName(QUESTION_EXPLANATION)[0] || document.getElementsByClassName(QUESTION_CONTENT)[0];
    predecessor.parentNode.insertBefore(this.solution, predecessor.nextSibling);

    // Could be useful for accessibility, but seems to jump to wrong position on some Safari versions
    //this.solution.focus();
    this.trigger('resize');
  };

  /**
   * Hide the solution.
   */
  Essay.prototype.hideSolution = function () {
    if (this.solution.parentNode !== null) {
      this.solution.parentNode.removeChild(this.solution);
    }
  };

  /**
   * Handle the evaluation.
   */
  Essay.prototype.handleEvaluation = function () {
    var results = this.computeResults();

    // Build explanations
    var explanations = this.buildExplanation(results);

    // Show explanations
    if (explanations.length > 0) {
      this.setExplanation(explanations, this.config.feedbackHeader);
    }

    // Not all keyword groups might be necessary for mastering
    var score = Math.min(this.computeScore(results), this.scoreMastering);
    var textScore = H5P.Question.determineOverallFeedback(this.config.overallFeedback, score / this.scoreMastering)
        .replace('@score', score)
        .replace('@total', this.scoreMastering);

    if (!this.config.behaviour.ignoreScoring) {
      this.setFeedback(textScore, score, this.scoreMastering);
    }

    // Show and hide buttons as necessary
    this.handleButtons(score);

    // Trigger xAPI statements as necessary
    this.handleXAPI(score);

    this.trigger('resize');
  };

  /**
   * Compute results.
   * @return {Object[]} Results: [[{"keyword": keyword, "match": match, "index": index}*]*]
   */
  Essay.prototype.computeResults = function () {
    var that = this;
    var results = [];

    // Should not happen, but just to be sure ...
    this.config.keywords = this.config.keywords || [];

    // optional = false is ignored in Editor
    this.config.keywords = this.config.keywords.filter(function (element) {
      return element.keyword !== undefined;
    });

    this.config.keywords.forEach(function (alternativeGroup) {
      var resultsGroup = [];
      var options = alternativeGroup.options;
      var alternatives = [alternativeGroup.keyword || []].concat(alternativeGroup.alternatives || []);

      // Detect all matches
      alternatives.forEach(function (alternative) {
        var inputTest = that.getInput();

        // Check for case sensitivity
        if (!options.caseSensitive || that.config.behaviour.overrideCaseSensitive === 'off') {
          alternative = alternative.toLowerCase();
          inputTest = inputTest.toLowerCase();
        }

        // Build array of matches for each type of match
        var matchesExact = that.detectExactMatches(alternative, inputTest);
        var matchesWildcard = alternative.indexOf('*') !== -1 ? that.detectWildcardMatches(alternative, inputTest) : [];
        var matchesFuzzy = options.forgiveMistakes ? that.detectFuzzyMatches(alternative, inputTest) : [];

        // Merge matches without duplicates
        that.mergeMatches(matchesExact, matchesWildcard, matchesFuzzy).forEach(function (item) {
          resultsGroup.push(item);
        });
      });
      results.push(resultsGroup);
    });
    return results;
  };

  /**
   * Compute the score for the results.
   * @param {Object} results - Results from the task.
   * @return {number} Score.
   */
  Essay.prototype.computeScore = function (results) {
    var score = 0;
    for (var i = 0; i < this.config.keywords.length; i++) {
      score += Math.min(results[i].length, this.config.keywords[i].options.occurrences) * this.config.keywords[i].options.points;
    }
    return score;
  };

  /**
   * Build the explanations for H5P.Question.setExplanation.
   * @param {Object} results - Results from the task.
   * @return {Object[]} Explanations for H5P.Question.
   */
  Essay.prototype.buildExplanation = function (results) {
    var explanations = [];

    for (var i = 0; i < this.config.keywords.length; i++) {
      // Keyword was not found and feedback is provided for this case
      if (results[i].length === 0 && this.config.keywords[i].options.feedbackMissed) {
        explanations.push({correct: FEEDBACK_EMPTY, text: this.config.keywords[i].options.feedbackMissed});
      }
      // Keyword found and feedback is provided for this case
      if (results[i].length > 0 && this.config.keywords[i].options.feedbackIncluded) {
        explanations.push({correct: this.config.keywords[i].keyword, text: this.config.keywords[i].options.feedbackIncluded});
      }
    }

    if (explanations.length > 0) {
      // Sort "included" before "not included", but keep order otherwise
      explanations.sort(function (a, b) {
        return a.correct === FEEDBACK_EMPTY && b.correct !== FEEDBACK_EMPTY;
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

    // We need the retry button if the mastering score has not been reached or scoring is irrelevant
    if (score < this.scoreMastering || this.config.behaviour.ignoreScoring) {
      if (this.config.behaviour.enableRetry) {
        this.showButton('try-again');
      }
    }
    else {
      this.hideButton('try-again');
    }
  };

  /**
   * Handle xAPI event triggering
   * @param {number} score - Score the user received.
   */
  Essay.prototype.handleXAPI = function (score) {
    this.trigger(this.createEssayXAPIEvent('completed'));

    if (!this.config.behaviour.ignoreScoring) {
      var xAPIEvent = this.createEssayXAPIEvent('scored');
      xAPIEvent.setScoredResult(score, this.scoreMastering, this, true, score >= this.scorePassing);
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
    }
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

  /**
   * Detect exact matches of needle in haystack.
   * @param {string} needle - Word or phrase to find.
   * @param {string} haystack - Text to find the word or phrase in.
   * @return {Object[]} Results: [{'keyword': needle, 'match': needle, 'index': front + pos}*].
   */
  Essay.prototype.detectExactMatches = function (needle, haystack) {
    // Simply detect all exact matches and its positions in the haystack
    var result = [];
    var pos = -1;
    var front = 0;
    while ((pos = haystack.indexOf(needle)) !== -1) {
      if (H5P.TextUtilities.isIsolated(needle, haystack)) {
        result.push({'keyword': needle, 'match': needle, 'index': front + pos});
      }
      front += pos + needle.length;
      haystack = haystack.substr(pos + needle.length);
    }
    return result;
  };

  /**
   * Detect wildcard matches of needle in haystack.
   * @param {string} needle - Word or phrase to find.
   * @param {string} haystack - Text to find the word or phrase in.
   * @return {Object[]} Results: [{'keyword': needle, 'match': needle, 'index': front + pos}*].
   */
  Essay.prototype.detectWildcardMatches = function (needle, haystack) {
    if (needle.indexOf('*') === -1) {
      return [];
    }
    // We accept only characters for the wildcard
    var regexp = new RegExp(needle.replace(/\*/g, '[A-z]*'), 'g');
    var result = [];
    var match;
    while ((match = regexp.exec(haystack)) !== null ) {
      if (H5P.TextUtilities.isIsolated(match[0], haystack, {'index': match.index})) {
        result.push({'keyword': needle, 'match': match[0], 'index': match.index});
      }
    }
    return result;
  };

  /**
   * Detect fuzzy matches of needle in haystack.
   * @param {string} needle - Word or phrase to find.
   * @param {string} haystack - Text to find the word or phrase in.
   * @param {Object[]} Results.
   */
  Essay.prototype.detectFuzzyMatches = function (needle, haystack) {
    // Ideally, this should be the maximum number of allowed transformations for the Levenshtein disctance.
    var windowSize = 2;
    /*
     * We cannot simple split words because we're also looking for phrases.
     * If we were just looking for exact matches, we could use something smarter
     * such as the KMP algorithm. Because we're dealing with fuzzy matches, using
     * this intuitive exhaustive approach might be the best way to go.
     */
    var results = [];
    // Without looking at the surroundings we'd miss words that have additional or missing chars
    for (var size = -windowSize; size <= windowSize; size++) {
      for (var pos = 0; pos < haystack.length; pos++) {
        var straw = haystack.substr(pos, needle.length + size);
        if (H5P.TextUtilities.areSimilar(needle, straw) && H5P.TextUtilities.isIsolated(straw, haystack, {'index': pos})) {
          // This will only add the match if it's not a duplicate that we found already in the proximity of pos
          if (!this.contains(results, pos)) {
            results.push({'keyword': needle, 'match': straw, 'index': pos});
          }
        }
      }
    }
    return results;
  };

  /**
   * Merge the matches.
   * @param {...Object[]} matches - Detected matches.
   * @return {Object[]} Merged matches.
   */
  Essay.prototype.mergeMatches = function () {
    // Sanitization
    if (arguments.length === 0) {
      return [];
    }
    if (arguments.length === 1) {
      return arguments[0];
    }

    // Add all elements from args[1+] to args[0] if not already there close by.
    var results = (arguments[0] || []).slice();
    for (var i = 1; i < arguments.length; i++) {
      var match2 = arguments[i] || [];
      for (var j = 0; j < match2.length; j++) {
        if (!this.contains(results, match2[j].index)) {
          results.push(match2[j]);
        }
      }
    }
    return results.sort(function (a, b) {
      return a.index > b.index;
    });
  };

  /**
   * Check if an array of detect results contains the same match in the word's proximity.
   * Used to prevent double entries that can be caused by fuzzy matching.
   * @param {Object} results - Preliminary results.
   * @param {string} results.match - Match that was found before at a particular position.
   * @param {number} results.index - Starting position of the match.
   * @param {number} index - Index of solution to be checked for double entry.
   */
  Essay.prototype.contains = function (results, index) {
    return results.some(function (result) {
      return Math.abs(result.index - index) <= result.match.length;
    });
  };

  /**
   * Extend an array just like JQuery's extend.
   * @param {...Object} arguments - Objects to be merged.
   * @return {Object} Merged objects.
   */
  Essay.prototype.extend = function () {
    for (var i = 1; i < arguments.length; i++) {
      for (var key in arguments[i]) {
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

  return Essay;
}(H5P.jQuery, H5P.Question);
