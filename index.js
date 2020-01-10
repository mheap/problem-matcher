module.exports = function(matcher, input) {
  validateMatcher(matcher);
  validateInput(input);

  if (matcher.pattern.length == 1) {
    return singleMatch(matcher, input);
  }

  const loopPattern = matcher.pattern[matcher.pattern.length - 1];
  if (loopPattern.loop) {
    return loopMatch(matcher, input);
  }

  throw new Error(
    "Unsupported pattern configuration. We currently support single pattern and multi-line loop pattern configurations"
  );
};

function loopMatch(matcher, input) {
  const lines = input.split("\n");
  const matches = [];

  // If we have context, try the loop line. If it matches, try it again
  // If not, reset context jump back to the first pattern
  while (lines.length) {
    let context = {};

    let line = lines.shift();

    // Take a copy that we can manipulate
    let patterns = matcher.pattern.slice(0);

    while ((x = patterns.shift())) {
      // Match the current line
      const re = new RegExp(x.regexp);

      let r = runRegExp(re, line, x, matcher);

      // If it's not a loop entry, save the matches in the context
      // and try processing the next pattern
      if (!x.loop) {
        context = { ...context, ...r };
        continue;
      }

      while ((line = lines.shift()) !== undefined) {
        if (line === "") {
          continue;
        }

        let r = runRegExp(re, line, x);

        // If the regexp didn't match, assume that the loop is over and start again
        if (!r) {
          lines.unshift(line);
          break;
        }

        // Otherwise add a match and run this loop again
        matches.push({ ...context, ...r });
      }
    }
  }

  return matches;
}

function singleMatch(matcher, input) {
  // We only support single line matchers at the moment
  const pattern = matcher.pattern[0];
  const re = new RegExp(pattern.regexp);

  const lines = [];

  for (let line of input.split("\n")) {
    let matches = runRegExp(re, line, pattern, matcher);
    if (!matches) {
      continue;
    }

    lines.push(matches);
  }

  return lines;
}

function validateMatcher(matcher) {
  if (!matcher) {
    throw new Error("No matcher provided");
  }

  if (!matcher.owner) {
    throw new Error("No matcher.owner provided");
  }

  if (!matcher.pattern) {
    throw new Error("No matcher.pattern provided");
  }

  if (!Array.isArray(matcher.pattern) || matcher.pattern.length < 1) {
    throw new Error("matcher.pattern must be an array with at least one value");
  }
}

function validateInput(input) {
  if (!input) {
    throw new Error("No input provided");
  }
}

function runRegExp(re, line, pattern, matcher) {
  const s = line.match(re);

  if (!s) {
    return null;
  }

  const matches = {};
  for (let k in pattern) {
    if (k == "regexp" || k == "loop") {
      continue;
    }

    if (pattern[k] === 0) {
      throw new Error(
        `Group 0 is not a valid capture group (it contains the entire matched string)`
      );
    }

    if (!s[pattern[k]]) {
      throw new Error(
        `Invalid capture group provided. Group ${pattern[k]} (${k}) does not exist in regexp`
      );
    }

    matches[k] = s[pattern[k]].trim();
  }

  if (!matches.severity) {
    matches.severity = matcher.severity;
  }

  return matches;
}
