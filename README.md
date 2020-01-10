# Problem Matcher

This library runs Problem Matcher definitions against an input and outputs any matches. These matches can then be used to add annotations etc to source code (like Github Actions does).

The inputs used for tests have been taken from [problem matchers](https://github.com/actions/toolkit/blob/master/docs/problem-matchers.md)

## Installation

```
npm install problem-matcher
```

## Usage

Pass single Problem matcher and any input you have to the function and it will return a list of annotations.

```javascript
const matcher = require("problem-matcher");
const results = matcher(yourMatcher, input);
```

See below for `yourMatcher` format examples.

### Single Pattern

```javascript
const eslintSingleMatcher = {
  owner: "eslint-compact",
  pattern: [
    {
      regexp:
        "^(.+):\\sline\\s(\\d+),\\scol\\s(\\d+),\\s(Error|Warning|Info)\\s-\\s(.+)\\s\\((.+)\\)$",
      file: 1,
      line: 2,
      column: 3,
      severity: 4,
      message: 5,
      code: 6
    }
  ]
};

const input = "badFile.js: line 50, col 11, Error - 'myVar' is defined but never used. (no-unused-vars)";

const result = matcher(eslintSingleMatcher, input);

// result
[{
  file: "badFile.js",
  line: "50",
  column: "11",
  severity: "Error",
  message: "'myVar' is defined but never used.",
  code: "no-unused-vars"
}]
```

### Loop Pattern

```javascript
const eslintLoopMatcher = {
  owner: "eslint-stylish",
  pattern: [
    {
      // Matches the 1st line in the output
      regexp: "^([^\\s].*)$",
      file: 1
    },
    {
      // Matches the 2nd and 3rd line in the output
      regexp: "^\\s+(\\d+):(\\d+)\\s+(error|warning|info)\\s+(.*)\\s\\s+(.*)$",
      // File is carried through from above, so we define the rest of the groups
      line: 1,
      column: 2,
      severity: 3,
      message: 4,
      code: 5,
      loop: true
    }
  ]
};

const input = `test.js
  1:0   error  Missing "use strict" statement                 strict
  5:10  error  'addOne' is defined but never used             no-unused-vars

foo.js
  36:10  error  Expected parentheses around arrow function argument  arrow-parens
  37:13  error  Expected parentheses around arrow function argument  arrow-parens

✖ 4 problems (4 errors, 0 warnings)`;

const result = matcher(eslintLoopMatcher, input);

// result
[
  {
    file: "test.js",
    line: "1",
    column: "0",
    severity: "error",
    message: 'Missing "use strict" statement',
    code: "strict"
  },
  {
    file: "test.js",
    line: "5",
    column: "10",
    severity: "error",
    message: "'addOne' is defined but never used",
    code: "no-unused-vars"
  },
  {
    file: "foo.js",
    line: "36",
    column: "10",
    severity: "error",
    message: "Expected parentheses around arrow function argument",
    code: "arrow-parens"
  },
  {
    file: "foo.js",
    line: "37",
    column: "13",
    severity: "error",
    message: "Expected parentheses around arrow function argument",
    code: "arrow-parens"
  }
];
```
