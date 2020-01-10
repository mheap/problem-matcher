const matcher = require(".");

const validMatcher = {
  owner: "test-matcher",
  severity: "Error",
  pattern: [
    {
      regexp: "^([^:]+):([^:]+):([^:]+)$",
      message: 1,
      file: 2,
      line: 3
    }
  ]
};

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

test("throws an error if the matcher is missing", () => {
  actual = () => matcher(undefined, "error::Something went wrong");
  expect(actual).toThrow("No matcher provided");
});

test("throws an error if the matcher is invalid (no owner)", () => {
  const m = {
    pattern: []
  };
  actual = () => matcher(m, "error::Something went wrong");
  expect(actual).toThrow("No matcher.owner provided");
});

test("throws an error if the matcher is invalid (no pattern)", () => {
  const m = {
    owner: "test"
  };
  actual = () => matcher(m, "error::Something went wrong");
  expect(actual).toThrow("No matcher.pattern provided");
});

test("throws an error if the matcher is invalid (empty pattern)", () => {
  const m = {
    owner: "test",
    pattern: []
  };
  actual = () => matcher(m, "error::Something went wrong");
  expect(actual).toThrow(
    "matcher.pattern must be an array with at least one value"
  );
});

test("throws an error if the matcher is invalid (invalid pattern)", () => {
  const m = {
    owner: "test",
    pattern: { invalid: true }
  };
  actual = () => matcher(m, "error::Something went wrong");
  expect(actual).toThrow(
    "matcher.pattern must be an array with at least one value"
  );
});

test("throws an error if the input is missing", () => {
  actual = () => matcher(validMatcher, undefined);
  expect(actual).toThrow("No input provided");
});

test("single line matcher, no match", () => {
  actual = matcher(eslintSingleMatcher, "this line won't match");
  expect(actual).toEqual([]);
});

test("single line matcher, does match", () => {
  const input =
    "badFile.js: line 50, col 11, Error - 'myVar' is defined but never used. (no-unused-vars)";
  actual = matcher(eslintSingleMatcher, input);
  expect(actual).toEqual([
    {
      file: "badFile.js",
      line: "50",
      column: "11",
      severity: "Error",
      message: "'myVar' is defined but never used.",
      code: "no-unused-vars"
    }
  ]);
});

test("loop line matcher, does match", () => {
  const input = `test.js
  1:0   error  Missing "use strict" statement                 strict
  5:10  error  'addOne' is defined but never used             no-unused-vars

foo.js
  36:10  error  Expected parentheses around arrow function argument  arrow-parens
  37:13  error  Expected parentheses around arrow function argument  arrow-parens

✖ 4 problems (4 errors, 0 warnings)`;

  actual = matcher(eslintLoopMatcher, input);
  expect(actual).toEqual([
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
  ]);
});

test("uses default severity", () => {
  const input = "Some Message:/path/to/file.js:12";
  actual = matcher(validMatcher, input);
  expect(actual).toEqual([
    {
      file: "/path/to/file.js",
      line: "12",
      severity: "Error",
      message: "Some Message"
    }
  ]);
});

test("uses overridden severity", () => {
  const input = "Warning:Some Message:/path/to/file.js:12";
  const warningMatcher = {
    owner: "test-matcher",
    severity: "Error",
    pattern: [
      {
        regexp: "^([^:]+):([^:]+):([^:]+):([^:]+)$",
        severity: 1,
        message: 2,
        file: 3,
        line: 4
      }
    ]
  };
  actual = matcher(warningMatcher, input);
  expect(actual).toEqual([
    {
      file: "/path/to/file.js",
      line: "12",
      severity: "Warning",
      message: "Some Message"
    }
  ]);
});

test("pattern index provided that doesn't match a capture group", () => {
  const input = "Some Message:/path/to/file.js:12";
  const invalidOffsetMatcher = {
    owner: "test-matcher",
    pattern: [
      {
        regexp: "^([^:]+):([^:]+):([^:]+)$",
        message: 1,
        file: 2,
        line: 3,
        code: 4
      }
    ]
  };
  actual = () => matcher(invalidOffsetMatcher, input);
  expect(actual).toThrow(
    "Invalid capture group provided. Group 4 (code) does not exist in regexp"
  );
});

test("pattern index provided that matches group 0", () => {
  const input = "Some Message:/path/to/file.js:12";
  const invalidOffsetMatcher = {
    owner: "test-matcher",
    pattern: [
      {
        regexp: "^([^:]+):([^:]+):([^:]+)$",
        message: 0
      }
    ]
  };
  actual = () => matcher(invalidOffsetMatcher, input);
  expect(actual).toThrow(
    `Group 0 is not a valid capture group (it contains the entire matched string)`
  );
});

test("unsupported pattern configuration", () => {
  const multipleNoLoopMatcher = {
    owner: "test-matcher",
    pattern: [
      {
        regexp: "^([^:]+)",
        message: 1
      },
      {
        regexp: '^([^"]+)',
        message: 1
      }
    ]
  };
  actual = () => matcher(multipleNoLoopMatcher, "Test");
  expect(actual).toThrow(
    `Unsupported pattern configuration. We currently support single pattern and multi-line loop pattern configurations`
  );
});
