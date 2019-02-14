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

const {
  createFormatters,
  LinkerStack
} = documentation.util;

function isFunction(section) {
  return section.kind === 'function' || section.kind === 'typedef' && section.type.type === 'NameExpression' && section.type.name === 'Function';
}

function formatSignature(section, formatters, isShort) {
  let returns = '';
  let prefix = '';

  if (section.kind === 'class') {
    prefix = 'new ';
  } else if (!isFunction(section)) {
    return section.name;
  }

  if (!isShort && section.returns && section.returns.length > 0) {
    returns = ' → ' + formatters.type(section.returns[0].type);
  }

  return prefix + section.name + formatters.parameters(section, isShort) + returns;
}

async function index (comments, config) {
  const linkerStack = new LinkerStack(config).namespaceResolver(comments, namespace => {
    const slugger = new GithubSlugger();
    return '#' + slugger.slug(namespace);
  });
  const formatters = createFormatters(linkerStack.link);
  hljs.configure(config.hljs || {});
  const badgesAST = await badges('docs', true);
  const sharedImports = {
    imports: {
      kebabCase(str) {
        return _kebabCase(str);
      },

      badges() {
        return formatters.markdown(badgesAST);
      },

      usage(example) {
        const usage = fs.readFileSync(path.resolve(example));
        return remark().use(gap).use(squeeze).parse(usage);
      },

      slug(str) {
        const slugger = new GithubSlugger();
        return slugger.slug(str);
      },

      shortSignature(section) {
        return formatSignature(section, formatters, true);
      },

      signature(section) {
        return formatSignature(section, formatters);
      },

      md(ast, inline) {
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

      highlight(example) {
        if (config.hljs && config.hljs.highlightAuto) {
          return hljs.highlightAuto(example).value;
        }

        return hljs.highlight('js', example).value;
      }

    }
  };

  const renderTemplate = source => _template(fs.readFileSync(path.join(__dirname, source), 'utf8'), sharedImports);

  sharedImports.imports.renderSectionList = renderTemplate('parts/section_list._');
  sharedImports.imports.renderSection = renderTemplate('parts/section._');
  sharedImports.imports.renderNote = renderTemplate('parts/note._');
  sharedImports.imports.renderParamProperty = renderTemplate('parts/paramProperty._');
  const pageTemplate = renderTemplate('parts/index._');
  return new Promise(resolve => {
    vfs.src([path.join(__dirname, 'assets', '**')], {
      base: __dirname
    }).pipe(concat(files => {
      resolve(files.concat(new File({
        path: 'index.html',
        contents: Buffer.from(pageTemplate({
          docs: comments,
          config
        }))
      })));
    }));
  });
}

module.exports = index;
