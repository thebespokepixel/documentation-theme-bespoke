'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _template = _interopDefault(require('lodash/template'));
var fs = _interopDefault(require('fs'));
var path = _interopDefault(require('path'));
var File = _interopDefault(require('vinyl'));
var vfs = _interopDefault(require('vinyl-fs'));
var concat = _interopDefault(require('concat-stream'));
var GithubSlugger = _interopDefault(require('github-slugger'));
var documentation = require('documentation');
var hljs = _interopDefault(require('highlight.js'));

const createFormatters = documentation.util.createFormatters;
const createLinkerStack = documentation.util.createLinkerStack;

function index (comments, options, callback) {
	const linkerStack = createLinkerStack(options).namespaceResolver(comments, namespace => {
		const slugger = new GithubSlugger();
		return '#' + slugger.slug(namespace);
	});

	const formatters = createFormatters(linkerStack.link);

	hljs.configure(options.hljs || {});

	const sharedImports = {
		imports: {
			slug(str) {
				const slugger = new GithubSlugger();
				return slugger.slug(str);
			},
			shortSignature(section) {
				let prefix = '';
				if (section.kind === 'class') {
					prefix = 'new ';
				} else if (section.kind !== 'function') {
					return section.name;
				}
				return prefix + section.name + formatters.parameters(section, true);
			},
			signature(section) {
				let returns = '';
				let prefix = '';
				if (section.kind === 'class') {
					prefix = 'new ';
				} else if (section.kind !== 'function') {
					return section.name;
				}
				if (section.returns) {
					returns = ' → ' + formatters.type(section.returns[0].type);
				}
				return prefix + section.name + formatters.parameters(section) + returns;
			},
			md(ast, inline) {
				if (inline && ast && ast.children.length && ast.children[0].type === 'paragraph') {
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
				if (options.hljs && options.hljs.highlightAuto) {
					return hljs.highlightAuto(example).value;
				}
				return hljs.highlight('js', example).value;
			}
		}
	};

	sharedImports.imports.renderSectionList = _template(fs.readFileSync(path.join(__dirname, 'parts/section_list._'), 'utf8'), sharedImports);
	sharedImports.imports.renderSection = _template(fs.readFileSync(path.join(__dirname, 'parts/section._'), 'utf8'), sharedImports);
	sharedImports.imports.renderNote = _template(fs.readFileSync(path.join(__dirname, 'parts/note._'), 'utf8'), sharedImports);

	const pageTemplate = _template(fs.readFileSync(path.join(__dirname, 'parts/index._'), 'utf8'), sharedImports);

	vfs.src([path.join(__dirname, 'assets', '**')], { base: __dirname }).pipe(concat(files => {
		callback(null, files.concat(new File({
			path: 'index.html',
			contents: new Buffer(pageTemplate({
				docs: comments,
				options
			}), 'utf8')
		})));
	}));
}

module.exports = index;