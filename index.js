'use strict';

var node_fs = require('node:fs');
var node_path = require('node:path');
var node_url = require('node:url');
var File = require('vinyl');
var vfs = require('vinyl-fs');
var _ = require('lodash');
var concat = require('concat-stream');
var GithubSlugger = require('github-slugger');
var documentation = require('documentation');
var hljs = require('highlight.js');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var File__default = /*#__PURE__*/_interopDefaultLegacy(File);
var vfs__default = /*#__PURE__*/_interopDefaultLegacy(vfs);
var ___default = /*#__PURE__*/_interopDefaultLegacy(_);
var concat__default = /*#__PURE__*/_interopDefaultLegacy(concat);
var GithubSlugger__default = /*#__PURE__*/_interopDefaultLegacy(GithubSlugger);
var hljs__default = /*#__PURE__*/_interopDefaultLegacy(hljs);

const {createFormatters, LinkerStack} = documentation.util;

function isFunction(section) {
	return (
		section.kind === 'function' ||
		(section.kind === 'typedef' &&
		section.type.type === 'NameExpression' &&
		section.type.name === 'Function')
	)
}

function formatSignature(section, formatters, isShort) {
	let returns = '';
	let prefix = '';
	if (section.kind === 'class') {
		prefix = 'new ';
	} else if (!isFunction(section)) {
		return section.name
	}

	if (!isShort && section.returns && section.returns.length > 0) {
		returns = ' → ' +
			formatters.type(section.returns[0].type);
	}

	return prefix + section.name + formatters.parameters(section, isShort) + returns
}

async function theme(comments, config) {
		const badges = await import('@thebespokepixel/badges').then(module => module.default);
		const {remark} = await import('remark');
		const gap = await import('remark-heading-gap').then(module => module.default);
		const squeeze = await import('remark-squeeze-paragraphs').then(module => module.default);
		const gfm = await import('remark-gfm').then(module => module.default);
		const html = await import('remark-html').then(module => module.default);
		const {visit} = await import('unist-util-visit');

		const linkerStack = new LinkerStack(config)
		.namespaceResolver(comments, namespace => {
			const slugger = new GithubSlugger__default["default"]();
			return '#' + slugger.slug(namespace)
		});

	const formatters = createFormatters(linkerStack.link);

	hljs__default["default"].configure(config.hljs || {});

	const badgesAST = await badges('docs', true);

	const highlighter = ast => {
		visit(ast, 'code', node => {
			if (node.lang) {
				node.type = 'html';
				node.value =
					"<pre class='hljs'>" +
					hljs__default["default"].highlightAuto(node.value, [node.lang]).value +
					'</pre>';
			}
		});
		return ast
	};

	const _rerouteLinks = (getHref, ast) => {
		visit(ast, 'link', node => {
			if (
				node.jsdoc &&
				!node.url.match(/^(http|https|\.)/) &&
				getHref(node.url)
			) {
				node.url = getHref(node.url);
			}
		});
		return ast
	};

	const rerouteLinks = _rerouteLinks.bind(undefined, linkerStack.link);

	const processMarkdown = ast => {
		if (ast) {
			return remark()
				.use(html, {sanitize: false})
				.stringify(highlighter(rerouteLinks(ast)))
		}
		return ''
	};

	const sharedImports = {
		imports: {
			kebabCase(content) {
				return ___default["default"].kebabCase(content)
			},
			badges() {
				return processMarkdown(badgesAST)
			},
			usage(example) {
				const usage = node_fs.readFileSync(node_path.resolve(example));
				return remark().use(gap).use(squeeze).use(gfm).parse(usage)
			},
			slug(content) {
				const slugger = new GithubSlugger__default["default"]();
				return slugger.slug(content)
			},
			shortSignature(section) {
				return formatSignature(section, formatters, true)
			},
			signature(section) {
				return formatSignature(section, formatters)
			},
			md(ast, inline) {
				if (inline && ast && ast.children.length > 0 && ast.children[0].type === 'paragraph') {
					ast = {
						type: 'root',
						children: ast.children[0].children.concat(ast.children.slice(1))
					};
				}

				return processMarkdown(ast)
			},
			formatType: formatters.type,
			autolink: formatters.autolink,
			highlight(example) {
				if (config.hljs && config.hljs.highlightAuto) {
					return hljs__default["default"].highlightAuto(example).value
				}

				return hljs__default["default"].highlight('js', example).value
			}
		}
	};

	const renderTemplate = source => ___default["default"].template(node_fs.readFileSync(node_path.join(node_path.dirname(node_url.fileURLToPath((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('index.js', document.baseURI).href)))), source), 'utf8'), sharedImports);

	sharedImports.imports.renderSectionList = renderTemplate('parts/section_list._');
	sharedImports.imports.renderSection = renderTemplate('parts/section._');
	sharedImports.imports.renderNote = renderTemplate('parts/note._');
	sharedImports.imports.renderParamProperty = renderTemplate('parts/paramProperty._');

	const pageTemplate = renderTemplate('parts/index._');

	// Push assets into the pipeline as well.
	return new Promise(resolve => {
		vfs__default["default"].src(
			[
				node_path.join(node_path.dirname(node_url.fileURLToPath((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('index.js', document.baseURI).href)))), 'assets', '**')
			],
			{base: node_path.dirname(node_url.fileURLToPath((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('index.js', document.baseURI).href))))}
		).pipe(
			concat__default["default"](files => {
				resolve(
					files.concat(
						new File__default["default"]({
							path: 'index.html',
							contents: Buffer.from(pageTemplate({
								docs: comments,
								config
							}))
						})
					)
				);
			})
		);
	})
}

module.exports = theme;
