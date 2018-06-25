'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _template = _interopDefault(require('lodash/template'));
var _kebabCase = _interopDefault(require('lodash/kebabCase'));
var fs = require('fs');
var path = require('path');
var File = _interopDefault(require('vinyl'));
var vfs = _interopDefault(require('vinyl-fs'));
var concat = _interopDefault(require('concat-stream'));
var GithubSlugger = _interopDefault(require('github-slugger'));
var documentation = require('documentation');
var hljs = _interopDefault(require('highlight.js'));
var badges = _interopDefault(require('@thebespokepixel/badges'));
var remark = _interopDefault(require('remark'));
var gap = _interopDefault(require('remark-heading-gap'));
var squeeze = _interopDefault(require('remark-squeeze-paragraphs'));

var createFormatters = documentation.util.createFormatters;
var LinkerStack = documentation.util.LinkerStack;

function formatSignature(section, formatters, isShort) {
  var returns = '';
  var prefix = '';

  if (section.kind === 'class') {
    prefix = 'new ';
  } else if (section.kind !== 'function') {
    return section.name;
  }

  if (!isShort && section.returns) {
    returns = ' → ' + formatters.type(section.returns[0].type);
  }

  return prefix + section.name + formatters.parameters(section, isShort) + returns;
}

function index (comments, options) {
  console.dir(comments);
  console.dir(options);
  var linkerStack = new LinkerStack(options).namespaceResolver(comments, function (namespace) {
    var slugger = new GithubSlugger();
    return '#' + slugger.slug(namespace);
  });
  var formatters = createFormatters(linkerStack.link);
  hljs.configure(options.hljs || {});
  return new Promise(function (resolve) {
    return badges('docs', true).then(function (badgesAST) {
      var sharedImports = {
        imports: {
          kebabCase: function kebabCase(str) {
            return _kebabCase(str);
          },
          badges: function badges$$1() {
            return formatters.markdown(badgesAST);
          },
          usage: function usage(example) {
            var usage = fs.readFileSync(path.resolve(example));
            return remark().use(gap).use(squeeze).parse(usage);
          },
          slug: function slug(str) {
            var slugger = new GithubSlugger();
            return slugger.slug(str);
          },
          shortSignature: function shortSignature(section) {
            return formatSignature(section, formatters, true);
          },
          signature: function signature(section) {
            return formatSignature(section, formatters);
          },
          md: function md(ast, inline) {
            if (inline && ast && ast.children.length > 0 && ast.children[0].type === 'paragraph') {
              ast = {
                type: 'root',
                children: ast.children[0].children.concat(ast.children.slice(1))
              };
            }

            return formatters.markdown(ast);
          },
          formatType: formatters.type,
          autolink: formatters.autolink,
          highlight: function highlight(example) {
            if (options.hljs && options.hljs.highlightAuto) {
              return hljs.highlightAuto(example).value;
            }

            return hljs.highlight('js', example).value;
          }
        }
      };

      var renderTemplate = function renderTemplate(source) {
        return _template(fs.readFileSync(path.join(__dirname, source), 'utf8'), sharedImports);
      };

      sharedImports.imports.renderSectionList = renderTemplate('parts/section_list._');
      sharedImports.imports.renderSection = renderTemplate('parts/section._');
      sharedImports.imports.renderNote = renderTemplate('parts/note._');
      sharedImports.imports.renderParamProperty = renderTemplate('parts/paramProperty._');
      var pageTemplate = renderTemplate('parts/index._');
      vfs.src([path.join(__dirname, 'assets', '**')], {
        base: __dirname
      }).pipe(concat(function (files) {
        resolve(files.concat(new File({
          path: 'index.html',
          contents: Buffer.from(pageTemplate({
            docs: comments,
            options: options
          }))
        })));
      }));
    });
  });
}

module.exports = index;
