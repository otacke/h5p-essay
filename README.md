H5P Essay
=========
Try to give automated feedback

This is rather an experimental playground than a fully elaborated content type for H5P. In its first stage, learners will be able to write a text and receive feedback immediately.
Initially (and maybe finally), this feedback will simply be based on a list of keywords that have been defined be a teaching person before.

The content type could possibly evolve into a solution for [automated essay scoring](https://en.wikipedia.org/wiki/Automated_essay_scoring) using machine learning techniques. However, that's merely wishful thinking right now. Also: Beware the pedagogical implications and stumbling blocks!

## Example
!["Sample Content with H5P Essay"](https://ibin.co/3s9w39KcHu0W.png "Sample Content with H5P Essay")

## Done
- As a student, I can enter an essay text and submit it for "grading".
- As a student, I can (automatically) save a draft and continue writing later.
- As a teacher, I can add an introductory text describing the task and hints.
- As a teacher, I can add keywords that the text will be scanned for.
- As a teacher, I can define minimum number of characters in order to force students to write a certain amount of text.
- As a teacher, I can define a maximum number of characters for the essay in order to stirr thinking about the task.
- As a teacher, I can toggle fuzzy comparison that will grant some grammatical flexibility, e.g. also accept the plural form of a word.
- As a teacher, I can override individual settings for caseSensitive and forgiveMistakes.
- As a teacher, I can set individuals points for a keyword and its variations and thus weigh them for scoring.
- As a teacher, I can set a maximum number of occurrences of keywords and its variations that shall be awarded with points.
- As a teacher, I can disable scoring and just use autimated feedback in order to prevent wii-ficiation.
- ~~As a teacher, I can decide that some keywords are mandatory while others are not.~~ (more transparent via score only)
- As a teacher, I can define multiple ranges that will allow more diverse feedback.
- As a teacher, I can define optional feedback phrases for a keyword; one for "if found in text" and one for "if not found in text". The content type might glue those phrases together, thus creating a feedback text.
- As a student, I can receive instant feedback beyond a simple score.
- As a teacher, I can use regular expressions for keywords if I feel the need to.
- As a teacher, I can decide if the learner will see the keyword, an alternative, the matched word or none with the feedback.
- As a teacher, I can set points that will be awarded in the host system (e.g. LMS) for merely answering an unscored question.

## Further Ideas
You're welcome to contribute your ideas as an issue on github. For now there are (in no particular order or guarantee):

### User Stories
- As a teacher, I can receive the texts and the results of students.
- As a teacher, I can set different levels of difficulty that the students can choose from.
- As a student, I can select different levels of difficulty in order to gradually test myself.

### xAPI statements
Compare https://web.archive.org/web/20170628002610/http://xapi.vocab.pub/datasets/adl/

- ~~experienced (when opened): DONE~~ (rather for activities without a "goal")
- completed (when submitted): DONE (but might be redundant)
- failed (if completed, but score is not sufficient): DONE
- passed (if completed and score is sufficient): DONE
- mastered (if completed and full score): DONE
- scored (if completed, submit numerical score): DONE

### Misc
- text statistics and metrics, e.g. readability metrics or maybe something related to the AFINN file
- different levels of difficulty, choosable by teacher and/or student
- add css styling to feedback text (?)
- improve accessibility
- later on: possibly build a model that allows to relate texts with scores from a human, so you can train the content type and then use this model to compute the/a score, too.

## About this repository
If you want to download the sourcecode, you can choose from three main branches:

- __release:__ Will contain the latest official release.
- __stable:__ Will contain features that have not yet been released, but that should work. Use at your own risk in a production environment.
- __master:__ Will contain the latest progress, but may not have been fully tested. Should definitely not be used in a production environment!
