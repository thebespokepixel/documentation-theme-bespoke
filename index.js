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
var pkgConf = require('pkg-conf');
var readPkgUp = require('read-pkg-up');
var unified = require('unified');
var remarkParse = require('remark-parse');
var remarkStringify = require('remark-stringify');
var mdastBuilder = require('mdast-builder');
var mdastSqueezeParagraphs = require('mdast-squeeze-paragraphs');
var remarkGfm = require('remark-gfm');
var urlencode = require('urlencode');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var File__default = /*#__PURE__*/_interopDefaultLegacy(File);
var vfs__default = /*#__PURE__*/_interopDefaultLegacy(vfs);
var ___default = /*#__PURE__*/_interopDefaultLegacy(_);
var concat__default = /*#__PURE__*/_interopDefaultLegacy(concat);
var GithubSlugger__default = /*#__PURE__*/_interopDefaultLegacy(GithubSlugger);
var hljs__default = /*#__PURE__*/_interopDefaultLegacy(hljs);
var remarkParse__default = /*#__PURE__*/_interopDefaultLegacy(remarkParse);
var remarkStringify__default = /*#__PURE__*/_interopDefaultLegacy(remarkStringify);
var remarkGfm__default = /*#__PURE__*/_interopDefaultLegacy(remarkGfm);
var urlencode__default = /*#__PURE__*/_interopDefaultLegacy(urlencode);

const remark = unified.unified().use(remarkParse__default["default"]).use(remarkStringify__default["default"]).freeze();

/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').Heading} Heading
 * @typedef {Heading['depth']} Depth
 * @typedef {import('mdast-util-to-markdown').Options} Extension
 *
 * @typedef {Partial<Record<Depth, {before?: number, after?: number}>>} Options
 */

/** @type {Options} */
const defaults = {2: {before: 2}};

/**
 * Plugin to adjust the gap between headings.
 *
 * @type {import('unified').Plugin<[Options?]|void[], Root>}
 */
function remarkHeadingGap(options = {}) {
  const data = this.data();
  const gaps = {...defaults, ...options};
  /** @type {Extension} */
  const headingGap = {
    join: [
      (left, right) => {
        if (left.type === 'heading') {
          return Math.max(
            size(left, 'after'),
            left.type === right.type ? size(right, 'before') : 0
          )
        }

        if (right.type === 'heading') {
          return size(right, 'before')
        }
      }
    ]
  };

  const extensions = /** @type {Extension[]} */ (
    // Other extensions
    /* c8 ignore next 2 */
    data.toMarkdownExtensions
      ? data.toMarkdownExtensions
      : (data.toMarkdownExtensions = [])
  );

  extensions.push(headingGap);

  /**
   * @param {Heading} node
   * @param {'before'|'after'} field
   * @returns {number}
   */
  function size(node, field) {
    const depth = node.depth;
    const gap = depth in gaps ? gaps[depth] : {};
    return gap && field in gap ? gap[field] || 0 : 1
  }
}

/**
 * @type {import('unified').Plugin<void[], import('mdast').Root>}
 */
function remarkSqueezeParagraphs() {
  return mdastSqueezeParagraphs.squeezeParagraphs
}

/**
 * Render a status badge.
 * @private
 * @param  {Object} config Configuration object.
 * @return {Node}          MDAST node containing badge.
 */
function render$9(config) {
	const badgeNode = mdastBuilder.image(
		`https://img.shields.io/badge/status-${config.text}-${config.color}`,
		config.title,
		config.title,
	);

	if (config.link) {
		return mdastBuilder.link(
			config.link,
			config.title,
			[badgeNode],
		)
	}

	return badgeNode
}

/**
 * Render a auxillary badge.
 * @private
 * @param  {Object} config Configuration object.
 * @return {Node}          MDAST node containing badge.
 */
function render$8(config) {
	const badgeNode = mdastBuilder.image(
		`https://img.shields.io/badge/${config.title}-${config.text}-${config.color}`,
		config.title,
		config.title,
	);

	if (config.link) {
		return mdastBuilder.link(
			config.link,
			config.title,
			[badgeNode],
		)
	}

	return badgeNode
}

/**
 * Render a second auxillary badge.
 * @private
 * @param  {Object} config Configuration object.
 * @return {Node}          MDAST node containing badge.
 */
function render$7(config) {
	const badgeNode = mdastBuilder.image(
		`https://img.shields.io/badge/${config.title}-${config.text}-${config.color}`,
		config.title,
		config.title,
	);

	if (config.link) {
		return mdastBuilder.link(
			config.link,
			config.title,
			[badgeNode],
		)
	}

	return badgeNode
}

function ccPath(user) {
	return user.codeclimateRepoToken
		? `repos/${user.codeclimateRepoToken}`
		: `github/${user.github.slug}`
}

function cc(config, user) {
	return mdastBuilder.link(
		`https://codeclimate.com/${ccPath(user)}/maintainability`,
		config.title,
		[
			mdastBuilder.image(
				`https://api.codeclimate.com/v1/badges/${user.codeclimateToken}/maintainability`,
				config.title,
				config.title,
			),
		],
	)
}

function ccCoverage(config, user) {
	return mdastBuilder.link(
		`https://codeclimate.com/${ccPath(user)}/test_coverage`,
		config.title,
		[
			mdastBuilder.image(
				`https://api.codeclimate.com/v1/badges/${user.codeclimateToken}/test_coverage`,
				config.title,
				config.title,
			),
		],
	)
}

/* eslint node/prefer-global/buffer: [error] */

function renderIcon(file, type) {
	const iconSource = node_fs.readFileSync(node_path.resolve(node_path.dirname(node_url.fileURLToPath((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('index.js', document.baseURI).href)))), file));
	const iconBuffer = Buffer.from(iconSource);

	return `&logo=${urlencode__default["default"](`data:${type};base64,${iconBuffer.toString('base64')}`)}`
}

const renderIconSVG = id => renderIcon(`icons/${id}.svg`, 'image/svg+xml');

function libsRelease(config, user) {
	return mdastBuilder.link(
		`https://libraries.io/github/${user.github.slug}`,
		config.title,
		[
			mdastBuilder.image(
				`https://img.shields.io/librariesio/release/npm/${
					user.fullName
				}/latest?${config.icon && renderIconSVG('libraries-io')}`,
				config.title,
				config.title,
			),
		],
	)
}

function libsRepo(config, user) {
	return mdastBuilder.link(
		`https://libraries.io/github/${user.github.slug}`,
		config.title,
		[
			mdastBuilder.image(
				`https://img.shields.io/librariesio/github/${
					user.librariesIoName
				}?${config.icon && renderIconSVG('libraries-io')}`,
				config.title,
				config.title,
			),
		],
	)
}

function render$6(config, user) {
	return mdastBuilder.link(
		`https://gitter.im/${
			user.github.user
		}/${
			config.room
		}?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge`,
		config.title,
		[
			mdastBuilder.image(
				`https://img.shields.io/gitter/room/${
					user.github.user
				}/${
					config.room
				}`,
				config.title,
				config.title,
			),
		],
	)
}

function render$5(config, user) {
	return mdastBuilder.link(
		`https://twitter.com/${user.twitter}`,
		config.title,
		[
			mdastBuilder.image(
				`https://img.shields.io/twitter/follow/${user.twitter}?style=social`,
				config.title,
				config.title,
			),
		],
	)
}

function render$4(config, user) {
	return mdastBuilder.link(
		`https://inch-ci.org/github/${user.github.slug}`,
		config.title,
		[
			mdastBuilder.image(
				`https://inch-ci.org/github/${
					user.github.slug
				}.svg?branch=${
					config.branch === 'dev' ? user.devBranch : config.branch
				}&style=shields`,
				config.title,
				config.title,
			),
		],
	)
}

function render$3(config, user) {
	return mdastBuilder.link(
		`https://www.npmjs.com/package/${user.fullName}`,
		config.title,
		[
			mdastBuilder.image(
				`https://img.shields.io/npm/v/${user.fullName}?logo=npm`,
				config.title,
				config.title,
			),
		],
	)
}

function render$2(config) {
	return mdastBuilder.link(
		'https://github.com/rollup/rollup/wiki/pkg.module',
		config.title,
		[
			mdastBuilder.image(
				`https://img.shields.io/badge/es6-${
					urlencode__default["default"]('type: module ✔')
				}-64CA39?${config.icon && renderIconSVG('rollup')}`,
				config.title,
				config.title,
			),
		],
	)
}

// [snyk-badge]:https://snyk.io/test/github/thebespokepixel/es-tinycolor/badge.svg
// [snyk]: https://snyk.io/test/github/MarkGriffiths/meta

function render$1(config, user) {
	return mdastBuilder.link(
		`https://snyk.io/test/github/${user.github.slug}`,
		config.title,
		[
			mdastBuilder.image(
				`https://snyk.io/test/github/${user.github.slug}/badge.svg`,
				config.title,
				config.title,
			),
		],
	)
}

// https://img.shields.io/travis/MarkGriffiths/badges.svg?branch=master&style=flat
// https://img.shields.io/travis/thebespokepixel/trucolor?logo=travis&style=flat-square
// https://img.shields.io/travis/thebespokepixel/trucolor/develop?style=flat&logo=travis
// https://travis-ci.org/MarkGriffiths/badges
//
function travis(config, user) {
	return mdastBuilder.link(
		`https://travis-ci.com/${user.github.slug}`,
		config.title,
		[
			mdastBuilder.image(
				`https://img.shields.io/travis/com/${user.github.slug}/${
					config.branch === 'dev' ? user.devBranch : config.branch
				}?logo=travis`,
				config.title,
				config.title,
			),
		],
	)
}

function travisPro(config, user) {
	return mdastBuilder.link(
		`https://travis-ci.com/${user.github.slug}`,
		config.title,
		[
			mdastBuilder.image(
				`https://api.travis-ci.com/${user.github.slug}.svg?branch=${
					config.branch === 'dev' ? user.devBranch : config.branch
				}&token=${
					user.travisToken
				}`,
				config.title,
				config.title,
			),
		],
	)
}

/* ────────────────────────╮
 │ @thebespokepixel/badges │
 ╰─────────────────────────┴─────────────────────────────────────────────────── */

const services = {
	status: render$9,
	aux1: render$8,
	aux2: render$7,
	gitter: render$6,
	twitter: render$5,
	'code-climate': cc,
	'code-climate-coverage': ccCoverage,
	'libraries-io-npm': libsRelease,
	'libraries-io-github': libsRepo,
	inch: render$4,
	'inch-dev': render$4,
	npm: render$3,
	rollup: render$2,
	snyk: render$1,
	travis,
	'travis-dev': travis,
	'travis-com': travis,
	'travis-com-dev': travis,
	'travis-pro': travisPro,
	'travis-pro-dev': travisPro
};

function parseQueue(collection, providers, user) {
	if (Array.isArray(collection)) {
		if (Array.isArray(collection[0])) {
			return mdastBuilder.paragraph(collection.map(content => parseQueue(content, providers, user)))
		}
		const badges = collection.map(content => parseQueue(content, providers, user));
		badges.push(mdastBuilder.brk);
		return mdastBuilder.paragraph(badges)
	}

	if (___default["default"].isObject(collection)) {
		return ___default["default"].map(collection, (content, title) => {
			return mdastBuilder.rootWithTitle(5, mdastBuilder.text(title), parseQueue(content, providers, user))
		})
	}

	if (!services[collection]) {
		throw new Error(`${collection} not found`)
	}

	return mdastBuilder.paragraph([services[collection](providers[collection], user), mdastBuilder.text(' ')])
}

/**
 * Render project badge configuration as markdown.
 * @param  {String} context The desired render context i.e: `readme`, `docs` as
 *                          defined in `package.json`.
 * @param  {Boolean} asAST  Render badges as {@link https://github.com/wooorm/mdast|MDAST}
 * @return {Promise}        A promise that resolves to the markdown formatted output.
 */
async function render(context, asAST = false) {
	const configArray = await Promise.all([
		pkgConf.packageConfig('badges'),
		readPkgUp.readPackageUp()
	]);
	const config = configArray[0];
	const pkg = configArray[1].packageJson;

	if (!config.name || !config.github || !config.npm) {
		throw new Error('Badges requires at least a package name, github repo and npm user account.')
	}

	if (!config[context]) {
		throw new Error(`${context} is not provided in package.json.`)
	}

	if (!config.providers) {
		throw new Error('At least one badge provider must be specified.')
	}

	const badgeQueue = {
		user: {
			name: config.name,
			fullName: pkg.name,
			librariesIoName: `${config['libraries-io']}/${config.name}`,
			scoped: /^@.+?\//.test(pkg.name),
			github: {
				user: config.github,
				slug: `${config.github}/${config.name}`
			},
			npm: config.npm,
			twitter: config.twitter || config.github,
			devBranch: 'develop',
			codeclimateToken: config.codeclimate,
			codeclimateRepoToken: config['codeclimate-repo'],
			travisToken: config.travis
		},
		providers: ___default["default"].forIn(___default["default"].defaultsDeep(config.providers, {
			status: {
				title: 'Status',
				text: 'badge',
				color: 'red',
				link: false
			},
			'aux-1': {
				title: 'Green',
				text: 'badge',
				color: 'green',
				link: false
			},
			'aux-2': {
				title: 'Blue',
				text: 'badge',
				color: 'blue',
				link: false
			},
			gitter: {
				title: 'Gitter',
				room: 'help'
			},
			twitter: {
				title: 'Twitter'
			},
			'code-climate': {
				title: 'Code-Climate'
			},
			'code-climate-coverage': {
				title: 'Code-Climate Coverage'
			},
			'libraries-io-npm': {
				title: 'Libraries.io',
				icon: true
			},
			'libraries-io-github': {
				title: 'Libraries.io',
				icon: true
			},
			inch: {
				title: 'Inch.io',
				branch: 'master'
			},
			'inch-dev': {
				title: 'Inch.io',
				branch: 'dev'
			},
			npm: {
				title: 'npm',
				icon: true
			},
			rollup: {
				title: 'Rollup',
				icon: true
			},
			snyk: {
				title: 'Snyk'
			},
			travis: {
				title: 'Travis',
				branch: 'master'
			},
			'travis-com': {
				title: 'Travis',
				branch: 'master'
			},
			'travis-pro': {
				title: 'Travis',
				branch: 'master'
			},
			'travis-dev': {
				title: 'Travis',
				branch: 'dev'
			},
			'travis-com-dev': {
				title: 'Travis',
				branch: 'dev'
			},
			'travis-pro-dev': {
				title: 'Travis',
				branch: 'dev'
			}
		}), value => ___default["default"].defaultsDeep(value, {
			icon: false
		})),
		queue: config[context]
	};

	const ast = mdastBuilder.root(parseQueue(badgeQueue.queue, badgeQueue.providers, badgeQueue.user));

	if (asAST) {
		return ast
	}

	return remark().use(remarkGfm__default["default"]).use(remarkHeadingGap).use(remarkSqueezeParagraphs).stringify(ast)
}

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
	const linkerStack = new LinkerStack(config)
		.namespaceResolver(comments, namespace => {
			const slugger = new GithubSlugger__default["default"]();
			return '#' + slugger.slug(namespace)
		});

	const formatters = createFormatters(linkerStack.link);

	hljs__default["default"].configure(config.hljs || {});

	const badgesAST = await render('docs', true);

	const sharedImports = {
		imports: {
			kebabCase(content) {
				return ___default["default"].kebabCase(content)
			},
			badges() {
				return formatters.markdown(badgesAST)
			},
			usage(example) {
				const usage = node_fs.readFileSync(node_path.resolve(example));
				return remark().use(remarkHeadingGap).use(remarkSqueezeParagraphs).parse(usage)
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

				return formatters.markdown(ast)
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
