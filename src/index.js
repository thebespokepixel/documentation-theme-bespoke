import {readFileSync} from 'node:fs'
import {join, resolve as resolvePath, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import File from 'vinyl'
import vfs from 'vinyl-fs'
import _ from 'lodash'
import concat from 'concat-stream'
import GithubSlugger from 'github-slugger'
import {util} from 'documentation'
import hljs from 'highlight.js'

const {createFormatters, LinkerStack} = util

function isFunction(section) {
	return (
		section.kind === 'function' ||
		(section.kind === 'typedef' &&
		section.type.type === 'NameExpression' &&
		section.type.name === 'Function')
	)
}

function formatSignature(section, formatters, isShort) {
	let returns = ''
	let prefix = ''
	if (section.kind === 'class') {
		prefix = 'new '
	} else if (!isFunction(section)) {
		return section.name
	}

	if (!isShort && section.returns && section.returns.length > 0) {
		returns = ' → ' +
			formatters.type(section.returns[0].type)
	}

	return prefix + section.name + formatters.parameters(section, isShort) + returns
}

export default async function theme(comments, config) {
		const badges = await import('@thebespokepixel/badges').then(module => module.default)
		const {remark} = await import('remark')
		const gap = await import('remark-heading-gap').then(module => module.default)
		const squeeze = await import('remark-squeeze-paragraphs').then(module => module.default)
		const gfm = await import('remark-gfm').then(module => module.default)
		const html = await import('remark-html').then(module => module.default)
		const {visit} = await import('unist-util-visit')

		const linkerStack = new LinkerStack(config)
		.namespaceResolver(comments, namespace => {
			const slugger = new GithubSlugger()
			return '#' + slugger.slug(namespace)
		})

	const formatters = createFormatters(linkerStack.link)

	hljs.configure(config.hljs || {})

	const badgesAST = await badges('docs', true)

	const highlighter = ast => {
		visit(ast, 'code', node => {
			if (node.lang) {
				node.type = 'html'
				node.value =
					"<pre class='hljs'>" +
					hljs.highlightAuto(node.value, [node.lang]).value +
					'</pre>'
			}
		})
		return ast
	}

	const _rerouteLinks = (getHref, ast) => {
		visit(ast, 'link', node => {
			if (
				node.jsdoc &&
				!node.url.match(/^(http|https|\.)/) &&
				getHref(node.url)
			) {
				node.url = getHref(node.url)
			}
		})
		return ast
	}

	const rerouteLinks = _rerouteLinks.bind(undefined, linkerStack.link)

	const processMarkdown = ast => {
		if (ast) {
			return remark()
				.use(html, {sanitize: false})
				.stringify(highlighter(rerouteLinks(ast)))
		}
		return ''
	}

	const sharedImports = {
		imports: {
			kebabCase(content) {
				return _.kebabCase(content)
			},
			badges() {
				return processMarkdown(badgesAST)
			},
			usage(example) {
				const usage = readFileSync(resolvePath(example))
				return remark().use(gap).use(squeeze).use(gfm).parse(usage)
			},
			slug(content) {
				const slugger = new GithubSlugger()
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
					}
				}

				return processMarkdown(ast)
			},
			formatType: formatters.type,
			autolink: formatters.autolink,
			highlight(example) {
				if (config.hljs && config.hljs.highlightAuto) {
					return hljs.highlightAuto(example).value
				}

				return hljs.highlight(example, {language: 'js'}).value
			}
		}
	}

	const renderTemplate = source => _.template(readFileSync(join(dirname(fileURLToPath(import.meta.url)), source), 'utf8'), sharedImports)

	sharedImports.imports.renderSectionList = renderTemplate('parts/section_list._')
	sharedImports.imports.renderSection = renderTemplate('parts/section._')
	sharedImports.imports.renderNote = renderTemplate('parts/note._')
	sharedImports.imports.renderParamProperty = renderTemplate('parts/paramProperty._')

	const pageTemplate = renderTemplate('parts/index._')

	// Push assets into the pipeline as well.
	return new Promise(resolve => {
		vfs.src(
			[
				join(dirname(fileURLToPath(import.meta.url)), 'assets', '**')
			],
			{base: dirname(fileURLToPath(import.meta.url))}
		).pipe(
			concat(files => {
				resolve(
					files.concat(
						new File({
							path: 'index.html',
							contents: Buffer.from(pageTemplate({
								docs: comments,
								config
							}))
						})
					)
				)
			})
		)
	})
}
