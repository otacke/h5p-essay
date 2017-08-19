H5P Essay
=========
Try to give automated feedback

This is rather an experimental playground than a fully elaborated content type for H5P.
In its first stage, learners will be able to write a text and receive feedback immediately.
Initially (and maybe finally), this feedback will simply be based on a list of keywords that have been defined be a teaching person before.

The content type could possibly evolve into a solution for [automated essay scoring](https://en.wikipedia.org/wiki/Automated_essay_scoring) using machine learning techniques. However, that's merely wishful thinking right now.

## Ideas
You're welcome to contribute your ideas as an issue on github. For now there are (in no particular order or guarantee):

### User Stories
- As a student, I can enter an essay text and submit it for "grading".
- As a student, I can (automatically) save a draft and continue writing later.
- As a teacher, I can add an introductory text describing the task and hints.
- As a teacher, I can add keywords that the text will be scanned for.
- As a teacher, I can toggle fuzzy comparison for each keyword that will grant some grammatical flexibility, e.g. also accept the plural form of a word.
- As a teacher, I can define how many keywords should be found in order to award a full score.
- As a teacher, I can define multiple ranges that will allow more diverse feedback.
- As a teacher, I can decide that some keywords are mandatory while others are not.
- As a teacher, I can define optional feedback phrases for a keyword; one for "if found in text" and one for "if not found in text". The content type might glue those phrases together, thus creating a feedback text.
- As a teacher, I can define a maximum number of characters for the essay.
- As a teacher, I can receive the texts and the results of students.

### xAPI statements
- experienced (when opened)
- completed (when sent)
- failed
- passed
- mastered
- scored

### GUI (for students)
- textarea
- send button
- feedback bar/star
