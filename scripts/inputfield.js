var H5P = H5P || {};

(function (Essay) {
  'use strict';

  // CSS Classes
  var MAIN_CONTAINER = 'h5p-essay-input-field';
  var INPUT_LABEL = 'h5p-essay-input-field-label';
  var INPUT_FIELD = 'h5p-essay-input-field-textfield';
  var WRAPPER_MESSAGE = 'h5p-essay-input-field-message-wrapper';
  var CHAR_MESSAGE = 'h5p-essay-input-field-message-char';
  var CHAR_MESSAGE_IMPORTANT = 'h5p-essay-input-field-message-char-important';
  var SAVE_MESSAGE = 'h5p-essay-input-field-message-save';
  var ANIMATION_MESSAGE = 'h5p-essay-input-field-message-save-animation';

  Essay.InputField = function (params, previousState) {
    var that = this;
    this.params = params;
    this.previousState = previousState;

    // Sanitization
    this.params.taskDescription = this.params.taskDescription || '';
    this.params.placeholderText = this.params.placeholderText || '';

    // Task description
    this.taskDescription = document.createElement('div');
    this.taskDescription.classList.add(INPUT_LABEL);
    this.taskDescription.setAttribute('tabindex', 0);
    this.taskDescription.setAttribute('aria-label',
        'Task Description:' + this.params.taskDescription.replace(/(<([^>]+)>)/ig, ''));
    this.taskDescription.innerHTML = this.params.taskDescription;

    // InputField
    this.inputField = document.createElement('textarea');
    this.inputField.classList.add(INPUT_FIELD);
    this.inputField.setAttribute('rows', this.params.inputFieldSize);
    this.inputField.setAttribute('maxlength', this.params.maximumLength);
    this.inputField.setAttribute('placeholder', this.params.placeholderText);
    this.inputField.setAttribute('tabindex', 0);
    this.setText(previousState);

    this.content = document.createElement('div');
    this.content.appendChild(this.inputField);

    // Container
    this.container = document.createElement('div');
    this.container.classList.add(MAIN_CONTAINER);
    this.container.appendChild(this.taskDescription);
    this.container.appendChild(this.content);

    var statusWrapper = document.createElement('div');
    statusWrapper.classList.add(WRAPPER_MESSAGE);

    this.statusChars = document.createElement('div');
    this.statusChars.classList.add(CHAR_MESSAGE);

    statusWrapper.appendChild(this.statusChars);

    ['change', 'keyup', 'paste'].forEach(function (event) {
      that.inputField.addEventListener(event, function () {
        that.updateMessageSaved('');
        that.updateMessageChars();
      });
    });

    this.statusSaved = document.createElement('div');
    this.statusSaved.classList.add(SAVE_MESSAGE);
    statusWrapper.appendChild(this.statusSaved);

    this.content.appendChild(statusWrapper);

    this.updateMessageChars();
  };

  /**
   * Get introduction for H5P.Question.
   * @return {object} DOM elements for introduction.
   */
  Essay.InputField.prototype.getIntroduction = function () {
    return this.taskDescription;
  };

  /**
   * Get content for H5P.Question.
   * @return {object} DOM elements for content.
   */
  Essay.InputField.prototype.getContent = function () {
    return this.content;
  };

  /**
   * Get current text in InputField.
   * @return {string} Current text.
   */
  Essay.InputField.prototype.getText = function () {
    return this.inputField.value;
  };

  /**
   * Disable the inputField.
   */
  Essay.InputField.prototype.disable = function () {
    this.inputField.disabled = true;
  };

  /**
   * Enable the inputField.
   */
  Essay.InputField.prototype.enable = function () {
    this.inputField.disabled = false;
  };

  /**
   * Enable the inputField.
   */
  Essay.InputField.prototype.focus = function () {
    this.inputField.focus();
  };

  /**
   * Set the text for the InputField.
   * @param {string|object} previousState Previous state that was saved.
   */
  Essay.InputField.prototype.setText = function (previousState) {
    if (previousState === undefined) {
      return;
    }
    if (typeof previousState === 'string') {
      this.inputField.innerHTML = previousState;
    }
    if (typeof previousState === 'object' && !Array.isArray(previousState)) {
      this.inputField.innerHTML = previousState.inputField || '';
    }
  };

  /**
   * Compute the remaining number of characters
   * @returns {number} Returns number of characters left
   */
  Essay.InputField.prototype.computeRemainingChars = function () {
    return this.params.maximumLength - this.inputField.value.length;
  };

  /**
   * Update character message field
   */
  Essay.InputField.prototype.updateMessageChars = function () {
    if (typeof this.params.maximumLength !== 'undefined') {
      this.setMessageChars(this.params.remainingChars.replace(/@chars/g, this.computeRemainingChars()), false);
    } else {
      this.setMessageChars('&nbsp;', false);
    }
  };

  /**
   * Update the indicator message for saved text
   * @param {string} saved - Message to indicate the text was saved
   */
  Essay.InputField.prototype.updateMessageSaved = function (saved) {
    // Add/remove blending effect
    if (saved === undefined || saved === '') {
      this.statusSaved.classList.remove(ANIMATION_MESSAGE);
    }
    else {
      this.statusSaved.classList.add(ANIMATION_MESSAGE);
    }
    this.statusSaved.innerHTML = saved;
  };

  /**
   * Set the text for the character message.
   * @param {string} message - Message text.
   * @param {boolean} important - If true, message will added a particular CSS class.
   */
  Essay.InputField.prototype.setMessageChars = function (message, important) {
    if (typeof message !== 'string') {
      return;
    }
    this.statusChars.innerHTML = message;
    if (important) {
      this.statusChars.classList.add(CHAR_MESSAGE_IMPORTANT);
    }
    else {
      this.statusChars.classList.remove(CHAR_MESSAGE_IMPORTANT);
    }
  };

})(H5P.Essay);
