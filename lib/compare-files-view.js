//
// * compare-files
// * https://github.com/floydpink/atom-compare-files
// *
// * Copyright (c) 2014 floydpink
// * Licensed under the MIT license.
//

(function () {
  'use strict';

  var $, $$$, CompareFilesView, ScrollView, _ref,
      __hasProp = {}.hasOwnProperty,
      __extends = function (child, parent) {
        for (var key in parent) {
          if (__hasProp.call(parent, key)) {
            child[key] = parent[key];
          }
        }
        /*jshint -W055 */
        function ctor() {
          /* jshint validthis:true */
          this.constructor = child;
        }

        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
        child.__super__ = parent.prototype;
        return child;
      };

  _ref = require('atom');
  $ = _ref.$;
  $$$ = _ref.$$$;
  ScrollView = _ref.ScrollView;

  module.exports = CompareFilesView = (function (_super) {
    __extends(CompareFilesView, _super);

    var diff = require('diff');
    var Encoder = require('node-html-encoder').Encoder;
    var encoder = new Encoder('numerical');
    var fs = require('fs');
    var path = require('path');
    var util = require('util');
    var _ = require('lodash');
    atom.deserializers.add(CompareFilesView);
    var ignoreWhitespace = false;
    var previousLine = null;

    var splitLinesAndWrap = function (diffString, elem) {
      var newLine = '\n'; // should be modified if atom becomes available for Windows
      if (diffString.lastIndexOf(newLine) === diffString.length - 1) {
        diffString = diffString.slice(0, -1); // remove the final new line
      }
      return _.map(diffString.split(newLine), function (l) {
        return util.format('<%s>%s</%s>', elem, encoder.htmlEncode(l), elem);
      });
    };

    var isAllWhiteSpaceChange = function (string1, string2) {
      var diffWords = diff.diffWords(string1, string2);
      var matches = diffWords.filter(function (d) {
        return (d.added || d.removed) && /\S/.test(d.value);
      });
      return matches.length == 0;
    }

    var doWhitespaceCheckAndSplit = function (diffString, elem) {
      if (!ignoreWhitespace) {
        return splitLinesAndWrap(diffString, elem);
      } else {
        if (!previousLine) {
          previousLine = [diffString, elem];
          return [];
        } else {
          var combinedDiff = [];
          if (!isAllWhiteSpaceChange(previousLine[0], diffString)) {
            combinedDiff = splitLinesAndWrap(previousLine[0], previousLine[1])
              .concat(splitLinesAndWrap(diffString, elem));
          } else {
            combinedDiff = splitLinesAndWrap(diffString, 'span');
          }
          previousLine = null;
          return combinedDiff;
        }
      }
    };

    var getNextChangedLineIndex = function (unprocessed) {
      return unprocessed.findIndex(function (line, lineNumber, lines) {
        return line.indexOf('<ins>') === 0 || line.indexOf('<del>') === 0;
      });
    };

    var injectSeparators = function (input) {
      var unprocessed = input;
      var totalLines = input.length;
      var processedCount = 0;
      var separatorLine = '<span>...</span>';
      var output = [];

      var firstDiffLine = getNextChangedLineIndex(unprocessed);

      while (firstDiffLine != -1 || processedCount < totalLines - 1) {
        var unchangedLines = unprocessed.slice(0, firstDiffLine);
        if (unchangedLines.length > 3) {
          if (output.length) {  // we already have some lines in the output - add the first three lines
            output = output.concat(unchangedLines.slice(0, 3));
          }
          output.push(separatorLine);
          if (firstDiffLine != -1 && processedCount < totalLines) { // we still have some more objects to process - add the last three lines
            output = output.concat(unchangedLines.slice(-3));
          }
        } else {
          output = output.concat(unchangedLines);
        }
        processedCount += unchangedLines.length;

        unprocessed = unprocessed.slice(firstDiffLine);
        var nextUnchangedLine = unprocessed.findIndex(function (line, lineNumber, lines) {
          return line.indexOf('<span>') === 0;
        });

        if (nextUnchangedLine === -1) { // no more unchangedlines
          output = output.concat(unprocessed);
          break;
        }

        var changedLines = unprocessed.slice(0,  nextUnchangedLine);
        output = output.concat(changedLines);
        processedCount += changedLines.length;

        unprocessed = unprocessed.slice(nextUnchangedLine);
        firstDiffLine = getNextChangedLineIndex(unprocessed);
      }

      return output;
    };

    var processDiffContents = function (diffContents) {
      var output = [];
      var totalDiffObjects = diffContents.length;

      if (totalDiffObjects === 1 && !diffContents[0].added && !diffContents[0].removed) {
        return null;
      }

      _.forEach(diffContents, function (diff) {
        output = output.concat((diff.added || diff.removed) ?
            doWhitespaceCheckAndSplit(diff.value, diff.added ? 'ins' : 'del') :
            output.concat(splitLinesAndWrap(diff.value, 'span'))
        );
      });

      return injectSeparators(output).join(' ');
    };

    var getLongPath = function (filepath) {
      var dirname = path.dirname(filepath);
      return util.format('%s/%s', dirname.slice(dirname.lastIndexOf(path.sep) + 1), path.basename(filepath));
    };

    CompareFilesView.deserialize = function (state) {
      return new CompareFilesView(state);
    };

    CompareFilesView.content = function () {
      return this.div({
        'class'  : 'compare-files native-key-bindings',
        tabindex : -1
      });
    };

    function CompareFilesView(argsObject) {
      this.filesName = argsObject.filesName;
      CompareFilesView.__super__.constructor.apply(this, arguments);

      this.validateFilesAndBegin();
      if (!atom.workspace) {
        atom.packages.once('activated', (function (self) {
          return function () {
            self.renderDiffContent();
          };
        })(this));
      }
    }

    CompareFilesView.prototype.validateFilesAndBegin = function () {
      if (!this.filesName) {
        return;
      }

      var filesNames = this.filesName.split('...');
      if (filesNames.length !== 2) {
        return;
      }

      this.file1 = filesNames[0];
      this.file2 = filesNames[1];

      this.filename1 = path.basename(this.file1);
      this.filename2 = path.basename(this.file2);

      if (this.filename1 === this.filename2) {
        this.filename1 = getLongPath(this.file1);
        this.filename2 = getLongPath(this.file2);
      }

      ignoreWhitespace = atom.config.get('compare-files.ignoreWhitespace');

      this.showLoading();
    };

    CompareFilesView.prototype.readAndProcessFiles = function () {
      var fileContents1 = fs.readFileSync(this.file1).toString();
      var fileContents2 = fs.readFileSync(this.file2).toString();

      this.diffContents = processDiffContents(diff.diffLines(fileContents1, fileContents2));
    };

    CompareFilesView.prototype.serialize = function () {
      return {
        deserializer : 'CompareFilesView',
        filesName    : this.filesName
      };
    };

    CompareFilesView.prototype.destroy = function () {
      return this.unsubscribe();
    };

    CompareFilesView.prototype.renderDiffContent = function () {
      this.readAndProcessFiles();
      var self = this;

      this.html($$$(function () {
        return this.raw(self.diffContents ? self.diffContents :
          '<ul class="background-message centered identical"><li>The files are identical.</li></ul>');
      }));
    };

    CompareFilesView.prototype.getTitle = function () {
      return util.format('%s...%s', this.filename1, this.filename2);
    };

    CompareFilesView.prototype.showLoading = function () {
      this.html($$$(function () {
        return this.div({
          'class' : 'compare-files-spinner'
        }, 'Comparing Files\u2026');
      }));
    };

    return CompareFilesView;

  })(ScrollView);

}).call(this);
