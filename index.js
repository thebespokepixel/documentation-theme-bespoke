'use strict'

function _interopDefault(ex) {
	return (ex && (typeof ex === 'object') && 'default' in ex) ? ex.default : ex
}

const _template = _interopDefault(require('lodash/template'))
const _kebabCase = _interopDefault(require('lodash/kebabCase'))
const fs = require('fs')
const path = require('path')
const File = _interopDefault(require('vinyl'))
const vfs = _interopDefault(require('vinyl-fs'))
const concat = _interopDefault(require('concat-stream'))
const GithubSlugger = _interopDefault(require('github-slugger'))
const documentation = require('documentation')
const hljs = _interopDefault(require('highlight.js'))
const badges = _interopDefault(require('@thebespokepixel/badges'))
const remark = _interopDefault(require('remark'))
const gap = _interopDefault(require('remark-heading-gap'))
const squeeze = _interopDefault(require('remark-squeeze-paragraphs'))

const createFormatters = documentation.util.createFormatters
const createLinkerStack = documentation.util.createLinkerStack

function formatSignature(section, formatters, isShort) {
	let returns = ''
	let prefix = ''
	if (section.kind === 'class') {
		prefix = 'new '
	} else if (section.kind !== 'function') {
		return section.name
	}
	if (!isShort && section.returns) {
		returns = ' → ' + formatters.type(section.returns[0].type)
	}
	return prefix + section.name + formatters.parameters(section, isShort) + returns
}

const index = function (comments, options, callback) {
	const linkerStack = createLinkerStack(options).namespaceResolver(comments, namespace => {
		const slugger = new GithubSlugger()
		return '#' + slugger.slug(namespace)
	})

	const formatters = createFormatters(linkerStack.link)

	hljs.configure(options.hljs || {})

	badges('docs', true).then(badgesAST => {
		const sharedImports = {
			imports: {
				kebabCase(str) {
					return _kebabCase(str)
				},
				badges() {
					return formatters.markdown(badgesAST)
				},
				usage(example) {
					const usage = fs.readFileSync(path.resolve(example))
					return remark().use(gap).use(squeeze).parse(usage)
				},
				slug(str) {
					const slugger = new GithubSlugger()
					return slugger.slug(str)
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
						}
					}
					return formatters.markdown(ast)
				},
				formatType: formatters.type,
				autolink: formatters.autolink,
				highlight(example) {
					if (options.hljs && options.hljs.highlightAuto) {
						return hljs.highlightAuto(example).value
					}
					return hljs.highlight('js', example).value
				}
			}
		}

		const renderTemplate = source => _template(fs.readFileSync(path.join(__dirname, source), 'utf8'), sharedImports)

		sharedImports.imports.renderSectionList = renderTemplate('parts/section_list._')
		sharedImports.imports.renderSection = renderTemplate('parts/section._')
		sharedImports.imports.renderNote = renderTemplate('parts/note._')

		const pageTemplate = renderTemplate('parts/index._')

		vfs.src([path.join(__dirname, 'assets', '**')], {
			base: __dirname
		}).pipe(concat(files => {
			callback(null, files.concat(new File({
				path: 'index.html',
				contents: new Buffer(pageTemplate({
					docs: comments,
					options
				}), 'utf8')
			})))
		}))
	})
}

module.exports = index

