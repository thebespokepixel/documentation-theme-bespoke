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
var badges = _interopDefault(require('@thebespokepixel/badges'));
var remark = _interopDefault(require('remark'));
var addUsage = _interopDefault(require('remark-usage'));

const createFormatters = documentation.util.createFormatters;
const createLinkerStack = documentation.util.createLinkerStack;

function formatSignature(section, formatters, isShort) {
	let returns = '';
	let prefix = '';
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

var index = function (comments, options, callback) {
	const linkerStack = createLinkerStack(options).namespaceResolver(comments, namespace => {
		const slugger = new GithubSlugger();
		return '#' + slugger.slug(namespace);
	});

	const formatters = createFormatters(linkerStack.link);

	hljs.configure(options.hljs || {});

	badges('docs', true).then(badgesAST => {
		const sharedImports = {
			imports: {
				badges() {
					return formatters.markdown(badgesAST);
				},
				usage(example, callback) {
					remark().use(addUsage, {
						example
					}).process('### Usage', (err, vfile) => {
						if (err) {
							console.error(`Error: ${ err }`);
						} else {
							callback(remark().parse(vfile.contents));
						}
					});
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
					if (options.hljs && options.hljs.highlightAuto) {
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

		const pageTemplate = renderTemplate('parts/index._');

		vfs.src([path.join(__dirname, 'assets', '**')], { base: __dirname }).pipe(concat(files => {
			callback(null, files.concat(new File({
				path: 'index.html',
				contents: new Buffer(pageTemplate({
					docs: comments,
					options
				}), 'utf8')
			})));
		}));
	});
};

module.exports = index;
