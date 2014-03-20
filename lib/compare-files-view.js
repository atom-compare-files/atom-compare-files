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
        function ctor() {
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
    var _ = require('lodash');
    var util = require('util');
    atom.deserializers.add(CompareFilesView);

    var splitLinesAndWrap = function (diffString, elem) {
      var newLine = '\n'; // should be modified if atom becomes available for Windows
      if (diffString.lastIndexOf(newLine) === diffString.length - 1) {
        diffString = diffString.slice(0, -1); // remove the final new line
      }
      return _.map(diffString.split(newLine), function (l) {
        return util.format('<%s>%s</%s>', elem, encoder.htmlEncode(l), elem);
      });
    };

    var processDiffContents = function (diffContents) {
      var output = [];
      var separatorLine = '<span>...</span>';

      _.forEach(diffContents, function (diff) {
        if (diff.added || diff.removed) {
          output = output.concat(splitLinesAndWrap(diff.value, diff.added ? 'ins' : 'del'));
        } else {
          var unchangedLines = splitLinesAndWrap(diff.value, 'span');
          if (unchangedLines.length > 6) {
            if (output.length) {  // we already have some lines in the output - get the first three lines
              output = output.concat(unchangedLines.slice(0, 3));
            }
            output.push(separatorLine);
            output = output.concat(unchangedLines.slice(-3));
          } else {
            output = output.concat(unchangedLines);
          }
        }
      });

      return output.join(' ');
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
      var filesName = argsObject.filesName;
      CompareFilesView.__super__.constructor.apply(this, arguments);

      this.handleEvents();
      this.readAndProcessFiles(filesName);
    }

    CompareFilesView.prototype.readAndProcessFiles = function (filesName) {
      if (!filesName) {
        return;
      }

      var filesNames = filesName.split('...');
      if (filesNames.length !== 2) {
        return;
      }

      this.showLoading();

      var file1 = filesNames[0];
      var file2 = filesNames[1];

      this.filename1 = path.basename(file1);
      this.filename2 = path.basename(file2);

      var fileContents1 = fs.readFileSync(file1).toString();
      var fileContents2 = fs.readFileSync(file2).toString();

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

    CompareFilesView.prototype.handleEvents = function () {
      this.subscribe(this, 'core:move-up', (function (_this) {
        return function () {
          return _this.scrollUp();
        };
      })(this));
      return this.subscribe(this, 'core:move-down', (function (_this) {
        return function () {
          return _this.scrollDown();
        };
      })(this));
    };

    CompareFilesView.prototype.renderDiffContent = function () {
      $('.compare-files-spinner').remove();
      $('.compare-files').append(this.diffContents);
    };

    CompareFilesView.prototype.getTitle = function () {
      return util.format('%s...%s', this.filename1, this.filename2);
    };

    CompareFilesView.prototype.showLoading = function () {
      return this.html($$$(function () {
        return this.div({
          'class' : 'compare-files-spinner'
        }, 'Comparing Files\u2026');
      }));
    };

    return CompareFilesView;

  })(ScrollView);

}).call(this);
